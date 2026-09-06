/* eslint-disable no-console */
/**
 * End-to-end smoke test covering the critical workflows from Section 45 of
 * the project brief. This talks to a REAL MongoDB (set MONGODB_URI), not a
 * mock -- it is meant to be run by a developer/CI once a database is
 * reachable, since the sandbox this codebase was originally built in has
 * no MongoDB server available.
 *
 * Usage:
 *   MONGODB_URI="mongodb://127.0.0.1:27017/yarn_erp_e2e" node scripts/e2e-smoke-test.js
 *
 * Exits with a non-zero code and a clear message on the first failed
 * assertion. Safe to re-run: it creates its own throwaway tenants/data on
 * every run.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { Tenant } from '../src/models/Tenant.js';
import { User } from '../src/models/User.js';
import { Quality } from '../src/models/Quality.js';
import { Party } from '../src/models/Party.js';
import { Company } from '../src/models/Company.js';
import { StockEntry } from '../src/models/StockEntry.js';
import { Beam } from '../src/models/Beam.js';
import { ROLES, permissionsForRole } from '../src/constants/permissions.js';
import { createStockEntry } from '../src/services/stockService.js';
import { createBeam } from '../src/services/beamService.js';
import { getStockBalance } from '../src/services/inventoryService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  \u2713 ${message}`);
  } else {
    failed += 1;
    console.error(`  \u2717 FAILED: ${message}`);
  }
}

async function makeTenantWithOwner(name, slugSuffix) {
  const tenant = await Tenant.create({ name, slug: `e2e-${slugSuffix}-${Date.now()}` });
  const passwordHash = await bcrypt.hash('password123', 12);
  const owner = await User.create({
    tenant: tenant._id,
    name: 'Owner',
    email: `owner-${slugSuffix}@e2e.test`,
    passwordHash,
    role: ROLES.OWNER,
    permissions: permissionsForRole(ROLES.OWNER),
  });
  return { tenant, owner };
}

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log(`Connected to ${env.mongoUri}\n`);

  // ---- Workflow 1 & 2: Registration + Masters ----------------------------
  console.log('Workflow 1-2: Registration + Masters');
  const { tenant: tenantA, owner: ownerA } = await makeTenantWithOwner('E2E Tenant A', 'a');
  const quality = await Quality.create({
    tenant: tenantA._id,
    name: '30D Polyester',
    shades: [{ name: '001' }, { name: '002' }],
    createdBy: ownerA._id,
  });
  const party = await Party.create({ tenant: tenantA._id, name: 'Test Party', createdBy: ownerA._id });
  const company = await Company.create({ tenant: tenantA._id, name: 'Test Company', createdBy: ownerA._id });
  assert(quality.shades.length === 2, 'Quality created with multiple shades under one master name');

  // ---- Workflow 3: Stock -------------------------------------------------
  console.log('\nWorkflow 3: Stock entry + inventory ledger');
  const shade = quality.shades[0];
  const stock = await createStockEntry({
    tenantId: tenantA._id,
    userId: ownerA._id,
    input: {
      date: new Date(),
      challanNo: 'CH-1',
      quality: quality._id,
      shadeId: shade._id,
      party: party._id,
      company: company._id,
      totalCones: 100,
      netWeightKg: 500,
      lotNo: 'LOT-1',
    },
  });
  const balanceAfterStock = await getStockBalance(tenantA._id, stock._id);
  assert(balanceAfterStock.remaining === 500, `Stock entry shows 500 KG available (got ${balanceAfterStock.remaining})`);
  assert(/^STK-\d{6}$/.test(stock.reference), `Stock entry got a sequential reference (${stock.reference})`);

  // ---- Workflow 4: Beam weight formula ------------------------------------
  console.log('\nWorkflow 4: Beam weight calculation (20000 x 2400 x 30 / 9,000,000)');
  const { beam: beam1 } = await createBeam({
    tenantId: tenantA._id,
    userId: ownerA._id,
    input: {
      sourceStockEntry: stock._id,
      productionDate: new Date(),
      lotNo: 'LOT-1',
      ends: 20000,
      meter: 2400,
      finalDenier: 30,
      consumedCones: 20,
      pipes: '4 Pipes',
    },
  });
  assert(beam1.beamWeightKg === 160, `Beam weight calculated as 160 KG (got ${beam1.beamWeightKg})`);
  assert(typeof beam1.pipes === 'string', 'Pipes stored as text, not a number');

  // ---- Workflow 5: Inventory consumption ----------------------------------
  console.log('\nWorkflow 5: Inventory consumption (500 - 160 = 340)');
  const balanceAfterBeam1 = await getStockBalance(tenantA._id, stock._id);
  assert(balanceAfterBeam1.remaining === 340, `Remaining is 340 KG after first beam (got ${balanceAfterBeam1.remaining})`);

  // ---- Workflow 6: Multiple beams ------------------------------------------
  console.log('\nWorkflow 6: Multiple beams against the same stock entry');
  const { beam: beam2 } = await createBeam({
    tenantId: tenantA._id,
    userId: ownerA._id,
    input: {
      sourceStockEntry: stock._id,
      productionDate: new Date(),
      lotNo: 'LOT-1',
      ends: 18750,
      meter: 2400,
      finalDenier: 30, // -> 150 KG
      consumedCones: 18,
    },
  });
  assert(beam2.beamWeightKg === 150, `Second beam calculated as 150 KG (got ${beam2.beamWeightKg})`);
  const balanceAfterBeam2 = await getStockBalance(tenantA._id, stock._id);
  assert(balanceAfterBeam2.remaining === 190, `Remaining is 190 KG after two beams (got ${balanceAfterBeam2.remaining})`);
  assert(balanceAfterBeam2.consumed === 310, `Total consumed is 310 KG (got ${balanceAfterBeam2.consumed})`);

  // ---- Workflow 7: Over-consumption rejected --------------------------------
  console.log('\nWorkflow 7: Over-consumption must be rejected, balance must not go negative');
  let overConsumptionRejected = false;
  try {
    await createBeam({
      tenantId: tenantA._id,
      userId: ownerA._id,
      input: {
        sourceStockEntry: stock._id,
        productionDate: new Date(),
        lotNo: 'LOT-1',
        ends: 60000,
        meter: 2400,
        finalDenier: 30, // -> 480 KG, far more than the 190 KG remaining
        consumedCones: 50,
      },
    });
  } catch (err) {
    overConsumptionRejected = err.statusCode === 409 || err.code === 'INSUFFICIENT_INVENTORY';
  }
  assert(overConsumptionRejected, 'Beam requiring more than available inventory was rejected');
  const balanceAfterRejection = await getStockBalance(tenantA._id, stock._id);
  assert(balanceAfterRejection.remaining === 190, 'Balance unchanged after the rejected over-consumption attempt');
  assert(balanceAfterRejection.remaining >= 0, 'Inventory never went negative');

  // ---- Workflow 8: Concurrent consumption ------------------------------------
  console.log('\nWorkflow 8: Concurrent beam creation against limited inventory (190 KG remaining)');
  // Two simultaneous requests each asking for 150 KG -- together they exceed
  // the 190 KG remaining, so exactly one must succeed and one must fail.
  const attempt = (ends) =>
    createBeam({
      tenantId: tenantA._id,
      userId: ownerA._id,
      input: {
        sourceStockEntry: stock._id,
        productionDate: new Date(),
        lotNo: 'LOT-1',
        ends,
        meter: 2400,
        finalDenier: 30, // -> 150 KG each
        consumedCones: 15,
      },
    }).then(
      () => ({ ok: true }),
      (err) => ({ ok: false, err })
    );
  const [r1, r2] = await Promise.all([attempt(18750), attempt(18750)]);
  const successCount = [r1, r2].filter((r) => r.ok).length;
  assert(successCount === 1, `Exactly one of two concurrent over-committing beam creations succeeded (got ${successCount})`);
  const balanceAfterConcurrency = await getStockBalance(tenantA._id, stock._id);
  assert(balanceAfterConcurrency.remaining >= 0, 'Inventory never went negative under concurrent writes');
  assert(
    Math.abs(balanceAfterConcurrency.remaining - 40) < 0.01,
    `Remaining is 40 KG after exactly one 150 KG beam succeeds (got ${balanceAfterConcurrency.remaining})`
  );

  // ---- Workflow 9: Traceability ----------------------------------------------
  console.log('\nWorkflow 9: Stock <-> Beam traceability');
  const beamsForStock = await Beam.find({ tenant: tenantA._id, sourceStockEntry: stock._id, status: 'active' });
  assert(beamsForStock.length === 3, `Stock entry shows 3 beams produced from it (got ${beamsForStock.length})`);
  const fetchedBeam = await Beam.findById(beam1._id);
  assert(String(fetchedBeam.sourceStockEntry) === String(stock._id), 'Beam references its exact source stock entry');

  // ---- Workflow 10: Tenant isolation -----------------------------------------
  console.log('\nWorkflow 10: Tenant isolation');
  const { tenant: tenantB, owner: ownerB } = await makeTenantWithOwner('E2E Tenant B', 'b');
  const crossTenantStock = await StockEntry.findOne({ _id: stock._id, tenant: tenantB._id });
  assert(crossTenantStock === null, "Tenant B's scoped query cannot see Tenant A's stock entry even with the real id");

  let crossTenantBeamRejected = false;
  try {
    // Attempt to produce a beam "as Tenant B" against Tenant A's stock --
    // the service takes tenantId as a parameter (as a controller would
    // pass req.tenantId from the authenticated session), so this simulates
    // exactly the attack the spec describes: a manipulated id can't cross
    // tenant boundaries because the stock lookup is always tenant-scoped.
    await createBeam({
      tenantId: tenantB._id,
      userId: ownerB._id,
      input: {
        sourceStockEntry: stock._id,
        productionDate: new Date(),
        lotNo: 'LOT-1',
        ends: 1000,
        meter: 100,
        finalDenier: 30,
        consumedCones: 1,
      },
    });
  } catch (err) {
    crossTenantBeamRejected = err.statusCode === 404;
  }
  assert(crossTenantBeamRejected, "Tenant B cannot consume Tenant A's stock even by supplying its real id");

  // ---- Cleanup -----------------------------------------------------------
  console.log('\nCleaning up e2e test data...');
  for (const t of [tenantA, tenantB]) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.all([
      User.deleteMany({ tenant: t._id }),
      Quality.deleteMany({ tenant: t._id }),
      Party.deleteMany({ tenant: t._id }),
      Company.deleteMany({ tenant: t._id }),
      StockEntry.deleteMany({ tenant: t._id }),
      Beam.deleteMany({ tenant: t._id }),
      mongoose.connection.collection('inventorytransactions').deleteMany({ tenant: t._id }),
      mongoose.connection.collection('counters').deleteMany({ tenant: t._id }),
      t.deleteOne(),
    ]);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async (err) => {
  console.error('\nFATAL ERROR during e2e smoke test:', err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
