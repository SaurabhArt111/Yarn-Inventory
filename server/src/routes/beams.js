import express from "express";
import { Beam, StockEntry, Master } from "../models/SaaS.js";
import { allow } from "../middleware/auth.js";
import { beamWeight } from "../utils/calc.js";
const r = express.Router();
const usedByStock = (beams) => {
  const used = new Map();
  for (const beam of beams) {
    if (beam.sourceAllocations?.length) {
      for (const allocation of beam.sourceAllocations) {
        const id = allocation.stockEntry.toString();
        used.set(id, (used.get(id) || 0) + allocation.weight);
      }
    } else if (beam.stockEntry) {
      const id = beam.stockEntry.toString();
      used.set(id, (used.get(id) || 0) + beam.beamWeight);
    }
  }
  return used;
};
r.get("/", async (req, res) =>
  res.json(
    await Beam.find({ companyId: req.user.companyId })
      .populate("quality party stockEntry")
      .sort({ date: -1, createdAt: -1 }),
  ),
);
r.post("/", allow("owner", "admin", "staff"), async (req, res) => {
  try {
    const {
      stockEntry,
      date,
      beamNo,
      challanNo,
      quality,
      party,
      ends,
      finalDenier,
      meter,
      width,
      pipes,
      remarks,
    } = req.body;
    if (
      !stockEntry ||
      !beamNo ||
      !date ||
      !challanNo ||
      !quality ||
      !party ||
      !ends ||
      !finalDenier ||
      !meter
    )
      return res
        .status(400)
        .json({ message: "Please complete all required beam fields" });
    const stock = await StockEntry.findOne({
      _id: stockEntry,
      companyId: req.user.companyId,
    });
    if (!stock)
      return res.status(404).json({ message: "Source stock entry not found" });
    const weight = beamWeight(ends, meter, finalDenier);
    const [q, p] = await Promise.all([
      Master.findOne({
        _id: quality,
        companyId: req.user.companyId,
        type: "quality",
      }),
      Master.findOne({
        _id: party,
        companyId: req.user.companyId,
        type: "party",
      }),
    ]);
    if (!q || !p)
      return res.status(400).json({ message: "Invalid quality or party" });
    if (stock.quality.toString() !== q._id.toString())
      return res.status(400).json({ message: "Selected stock does not match the selected quality" });
    const compatibleStocks = await StockEntry.find({
      companyId: req.user.companyId,
      quality: q._id,
    }).sort({ date: 1, createdAt: 1 });
    const beams = await Beam.find({
      companyId: req.user.companyId,
      quality: q._id,
    }).select("stockEntry sourceAllocations beamWeight");
    const used = usedByStock(beams);
    const orderedStocks = [
      stock,
      ...compatibleStocks.filter((entry) => entry._id.toString() !== stock._id.toString()),
    ];
    let remainingToAllocate = weight;
    const sourceAllocations = [];
    for (const entry of orderedStocks) {
      const available = Math.max(0, Number((entry.netWeight - (used.get(entry._id.toString()) || 0)).toFixed(3)));
      const allocation = Math.min(available, remainingToAllocate);
      if (allocation > 0) {
        sourceAllocations.push({ stockEntry: entry._id, weight: Number(allocation.toFixed(3)) });
        remainingToAllocate = Number((remainingToAllocate - allocation).toFixed(3));
      }
      if (remainingToAllocate <= 0.0001) break;
    }
    if (remainingToAllocate > 0.0001) {
      const availableTotal = Number((weight - remainingToAllocate).toFixed(3));
      return res.status(400).json({
        message: `Beam needs ${weight} KG but only ${availableTotal} KG is available across stock entries for this quality`,
      });
    }
    const b = await Beam.create({
      companyId: req.user.companyId,
      stockEntry: sourceAllocations[0].stockEntry,
      sourceAllocations,
      date,
      beamNo,
      challanNo,
      quality,
      party,
      ends: Number(ends),
      finalDenier: Number(finalDenier),
      meter: Number(meter),
      beamWeight: weight,
      width: Number(width || 0),
      pipes: pipes || "",
      remarks: remarks || "",
    });
    res.status(201).json(await b.populate("quality party stockEntry"));
  } catch (e) {
    res
      .status(500)
      .json({ message: "Could not create beam", detail: e.message });
  }
});
r.get("/source/:stockEntry", async (req, res) => {
  const stock = await StockEntry.findOne({
    _id: req.params.stockEntry,
    companyId: req.user.companyId,
  });
  if (!stock) return res.status(404).json({ message: "Stock entry not found" });
  const [stocks, beams] = await Promise.all([
    StockEntry.find({
      companyId: stock.companyId,
      quality: stock.quality,
    }),
    Beam.find({
      companyId: stock.companyId,
      quality: stock.quality,
    }).select(
      "stockEntry sourceAllocations beamWeight",
    ),
  ]);
  const used = usedByStock(beams);
  const remainingWeight = stocks.reduce(
    (total, entry) => total + Math.max(0, entry.netWeight - (used.get(entry._id.toString()) || 0)),
    0,
  );
  res.json({
    stockWeight: stock.netWeight,
    usedWeight: Number((stocks.reduce((total, entry) => total + (used.get(entry._id.toString()) || 0), 0)).toFixed(3)),
    remainingWeight: Number(remainingWeight.toFixed(3)),
  });
});
export default r;
