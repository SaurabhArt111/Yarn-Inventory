/* eslint-disable no-console */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { Tenant } from '../src/models/Tenant.js';
import { User } from '../src/models/User.js';
import { Quality } from '../src/models/Quality.js';
import { Party } from '../src/models/Party.js';
import { Company } from '../src/models/Company.js';
import { ROLES, permissionsForRole } from '../src/constants/permissions.js';
import { createStockEntry } from '../src/services/stockService.js';
import { createBeam } from '../src/services/beamService.js';
import { calculateBeamWeightKg } from '../src/utils/inventoryMath.js';

const DESTROY = process.argv.includes('--destroy');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log('[seed] connected to', env.mongoUri);

  const slug = 'dev-textiles';

  if (DESTROY) {
    const existing = await Tenant.findOne({ slug });
    if (existing) {
      const { StockEntry } = await import('../src/models/StockEntry.js');
      const { Beam } = await import('../src/models/Beam.js');
      const { InventoryTransaction } = await import('../src/models/InventoryTransaction.js');
      const { AuditLog } = await import('../src/models/AuditLog.js');
      await Promise.all([
        User.deleteMany({ tenant: existing._id }),
        Quality.deleteMany({ tenant: existing._id }),
        Party.deleteMany({ tenant: existing._id }),
        Company.deleteMany({ tenant: existing._id }),
        StockEntry.deleteMany({ tenant: existing._id }),
        Beam.deleteMany({ tenant: existing._id }),
        InventoryTransaction.deleteMany({ tenant: existing._id }),
        AuditLog.deleteMany({ tenant: existing._id }),
        mongoose.connection.collection('counters').deleteMany({ tenant: existing._id }),
      ]);
      await existing.deleteOne();
      console.log('[seed] destroyed existing dev tenant and all its data');
    }
    await mongoose.disconnect();
    return;
  }

  let tenant = await Tenant.findOne({ slug });
  if (tenant) {
    console.log('[seed] dev tenant already exists, reusing it. Run with --destroy first for a clean reseed.');
  } else {
    tenant = await Tenant.create({
      name: 'Dev Textiles Pvt Ltd',
      slug,
      businessType: 'Yarn Manufacturing',
      phone: '+91 90000 00000',
    });
    console.log('[seed] created tenant', tenant.name);
  }

  async function ensureUser(name, email, role) {
    let user = await User.findOne({ tenant: tenant._id, email });
    if (user) return user;
    const passwordHash = await bcrypt.hash('password123', 12);
    user = await User.create({
      tenant: tenant._id,
      name,
      email,
      passwordHash,
      role,
      permissions: permissionsForRole(role),
    });
    console.log(`[seed] created ${role} user`, email);
    return user;
  }

  const owner = await ensureUser('Priya Sharma', 'owner@dev-textiles.test', ROLES.OWNER);
  await ensureUser('Rahul Mehta', 'admin@dev-textiles.test', ROLES.ADMIN);
  await ensureUser('Sana Iqbal', 'staff@dev-textiles.test', ROLES.STAFF);

  async function ensureQuality(name, shadeNames) {
    let quality = await Quality.findOne({ tenant: tenant._id, name });
    if (!quality) {
      quality = await Quality.create({
        tenant: tenant._id,
        name,
        shades: shadeNames.map((s) => ({ name: s })),
        createdBy: owner._id,
      });
      console.log('[seed] created quality', name);
    }
    return quality;
  }

  const q1 = await ensureQuality('30D Polyester', ['001', '002', '003', '004']);
  const q2 = await ensureQuality('40D Nylon', ['N-Black', 'N-White']);
  const q3 = await ensureQuality('20D Spandex', ['S-Natural']);

  async function ensureParty(name) {
    let p = await Party.findOne({ tenant: tenant._id, name });
    if (!p) p = await Party.create({ tenant: tenant._id, name, createdBy: owner._id });
    return p;
  }
  const partyA = await ensureParty('Shree Textile Traders');
  const partyB = await ensureParty('Gujarat Yarn Suppliers');
  const partyC = await ensureParty('Om Fibers & Co.');

  async function ensureCompany(name) {
    let c = await Company.findOne({ tenant: tenant._id, name });
    if (!c) c = await Company.create({ tenant: tenant._id, name, createdBy: owner._id });
    return c;
  }
  const companyA = await ensureCompany('Sunrise Weaving Mills');
  const companyB = await ensureCompany('Vraj Twisting Works');

  const existingStock = await (await import('../src/models/StockEntry.js')).StockEntry.countDocuments({ tenant: tenant._id });
  if (existingStock > 0) {
    console.log('[seed] stock entries already exist, skipping stock/beam seeding to avoid duplicates');
    await printSummary(tenant);
    await mongoose.disconnect();
    return;
  }

  const stockPlan = [
    { quality: q1, shadeIdx: 0, party: partyA, company: companyA, netWeightKg: 500, totalCones: 100, lotNo: 'LOT-1001', challanNo: 'CH-5001', daysAgo: 10 },
    { quality: q1, shadeIdx: 1, party: partyB, company: companyA, netWeightKg: 420, totalCones: 84, lotNo: 'LOT-1002', challanNo: 'CH-5002', daysAgo: 8 },
    { quality: q2, shadeIdx: 0, party: partyA, company: companyB, netWeightKg: 300, totalCones: 60, lotNo: 'LOT-2001', challanNo: 'CH-5003', daysAgo: 6 },
    { quality: q2, shadeIdx: 1, party: partyC, company: companyB, netWeightKg: 250, totalCones: 50, lotNo: 'LOT-2002', challanNo: 'CH-5004', daysAgo: 4 },
    { quality: q3, shadeIdx: 0, party: partyC, company: companyA, netWeightKg: 180, totalCones: 36, lotNo: 'LOT-3001', challanNo: 'CH-5005', daysAgo: 2 },
    { quality: q1, shadeIdx: 2, party: partyB, company: companyB, netWeightKg: 600, totalCones: 120, lotNo: 'LOT-1003', challanNo: 'CH-5006', daysAgo: 0 },
  ];

  const createdStock = [];
  for (const plan of stockPlan) {
    const shade = plan.quality.shades[plan.shadeIdx];
    // eslint-disable-next-line no-await-in-loop
    const entry = await createStockEntry({
      tenantId: tenant._id,
      userId: owner._id,
      input: {
        date: daysAgo(plan.daysAgo),
        challanNo: plan.challanNo,
        quality: plan.quality._id,
        shadeId: shade._id,
        party: plan.party._id,
        company: plan.company._id,
        box: `Box-${Math.ceil(Math.random() * 20)}`,
        totalCones: plan.totalCones,
        netWeightKg: plan.netWeightKg,
        lotNo: plan.lotNo,
        remarks: 'Seed data',
      },
    });
    createdStock.push({ entry, plan });
    console.log(`[seed] created stock ${entry.reference} (${plan.netWeightKg} KG, ${plan.totalCones} cones)`);
  }

  // Produce a handful of beams against the first few stock entries,
  // demonstrating multiple beams per stock entry and a range of balances.
  const beamPlans = [
    { stockIdx: 0, ends: 20000, meter: 2400, finalDenier: 30, consumedCones: 20 }, // -> 160 KG
    { stockIdx: 0, ends: 18750, meter: 2400, finalDenier: 30, consumedCones: 18 }, // -> 150 KG
    { stockIdx: 0, ends: 15000, meter: 2400, finalDenier: 30, consumedCones: 14 }, // -> 120 KG (total 430/500 consumed, 70 remaining)
    { stockIdx: 1, ends: 20000, meter: 2000, finalDenier: 35, consumedCones: 28 }, // -> ~155.56 KG
    { stockIdx: 2, ends: 22000, meter: 1800, finalDenier: 25, consumedCones: 22 }, // -> ~110 KG
  ];

  for (const bp of beamPlans) {
    const { entry, plan } = createdStock[bp.stockIdx];
    const weight = calculateBeamWeightKg({ ends: bp.ends, meter: bp.meter, finalDenier: bp.finalDenier });
    // eslint-disable-next-line no-await-in-loop
    const { beam } = await createBeam({
      tenantId: tenant._id,
      userId: owner._id,
      input: {
        sourceStockEntry: entry._id,
        productionDate: daysAgo(Math.max(0, plan.daysAgo - 1)),
        challanNo: entry.challanNo,
        lotNo: entry.lotNo,
        ends: bp.ends,
        meter: bp.meter,
        finalDenier: bp.finalDenier,
        consumedCones: bp.consumedCones,
        width: '1520mm',
        pipes: '4 Pipes',
        remarks: 'Seed data',
      },
    });
    console.log(`[seed] created beam ${beam.reference} (${weight} KG) from ${entry.reference}`);
  }

  await printSummary(tenant);
  await mongoose.disconnect();
  console.log('[seed] done. Login with any of:');
  console.log('  owner@dev-textiles.test / password123 (Owner)');
  console.log('  admin@dev-textiles.test / password123 (Admin)');
  console.log('  staff@dev-textiles.test / password123 (Staff)');
}

async function printSummary(tenant) {
  const { StockEntry } = await import('../src/models/StockEntry.js');
  const { Beam } = await import('../src/models/Beam.js');
  const stockCount = await StockEntry.countDocuments({ tenant: tenant._id });
  const beamCount = await Beam.countDocuments({ tenant: tenant._id });
  console.log(`[seed] tenant "${tenant.name}" now has ${stockCount} stock entries and ${beamCount} beams`);
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exitCode = 1;
});
