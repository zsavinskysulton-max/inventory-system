const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

let masterItems = [];
let transactions = [];

// MASTER
app.post("/master", (req, res) => {
  masterItems.push(req.body);
  res.send("OK");
});

app.get("/master", (req, res) => {
  res.json(masterItems);
});

// TRANSACTION
app.post("/transaction", (req, res) => {
  transactions.push(req.body);
  res.send("OK");
});

app.get("/transaction", (req, res) => {
  res.json(transactions);
});

// STOCK
app.get("/stock", (req, res) => {
  let result = masterItems.map(item => {
    let totalIn = 0;
    let totalOut = 0;

    transactions.forEach(t => {
      if (t.code === item.code) {
        if (t.type === "IN") totalIn += t.qty;
        if (t.type === "OUT") totalOut += t.qty;
      }
    });

    let stock = totalIn - totalOut;
    let percent = item.min_stock ? (stock / item.min_stock) * 100 : 0;

    let status = "AMAN";
    if (stock === 0) status = "CRITICAL";
    else if (percent < 25) status = "URGENT";
    else if (percent < 70) status = "PERLU BELI";

    return {
      ...item,
      totalIn,
      totalOut,
      stock,
      percent: percent.toFixed(2) + "%",
      status
    };
  });

  res.json(result);
});

// PROCUREMENT
app.get("/procurement", (req, res) => {
  let result = [];

  masterItems.forEach(item => {
    let totalIn = 0;
    let totalOut = 0;

    transactions.forEach(t => {
      if (t.code === item.code) {
        if (t.type === "IN") totalIn += t.qty;
        if (t.type === "OUT") totalOut += t.qty;
      }
    });

    let stock = totalIn - totalOut;

    if (stock < item.min_stock) {
      result.push({
        code: item.code,
        name: item.name,
        stock,
        min_stock: item.min_stock,
        qty_to_buy: item.min_stock - stock
      });
    }
  });

  res.json(result);
});

app.listen(3000, () => {
  console.log("Server jalan di http://localhost:3000");
});