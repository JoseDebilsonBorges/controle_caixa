require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors({
  origin: [
    "https://controle-caixa-delta.vercel.app",
    "https://controle-caixa-9rtsyhw9q-josedebilsonborges-projects.vercel.app"
  ]
}));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.get("/", (req, res) => {
  res.send("Servidor rodando com banco 🚀");
});

// LISTAR PEDIDOS
app.get("/pedidos", async (req, res) => {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .order("comanda", { ascending: true });

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data);
});

// CRIAR PEDIDO
app.post("/pedidos", async (req, res) => {
  const { cliente, item, quantidade, valor, formaPagamento } = req.body;

  if (!cliente || !item || !quantidade || !valor || !formaPagamento) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }

  const { data: ultimo } = await supabase
    .from("pedidos")
    .select("comanda")
    .order("comanda", { ascending: false })
    .limit(1)
    .maybeSingle();

  const novaComanda = ultimo ? ultimo.comanda + 1 : 1;

  const { data, error } = await supabase
    .from("pedidos")
    .insert([{
      comanda: novaComanda,
      cliente,
      item,
      quantidade: Number(quantidade),
      valor: Number(valor),
      total: Number(quantidade) * Number(valor),
      forma_pagamento: formaPagamento,
      status: "Pendente"
    }])
    .select();

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data[0]);
});

// ATUALIZAR STATUS
app.put("/pedidos/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const { data, error } = await supabase
    .from("pedidos")
    .update({ status })
    .eq("id", id)
    .select();

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data[0]);
});

// CANCELAR
app.put("/pedidos/:id/cancelar", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("pedidos")
    .update({ status: "Cancelado" })
    .eq("id", id)
    .select();

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data[0]);
});

// EXCLUIR
app.delete("/pedidos/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("pedidos")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json({ erro: error.message });

  res.json({ sucesso: true });
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});