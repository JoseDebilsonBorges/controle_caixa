require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors({
  origin: "*"
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

app.put("/pedidos/:id/pagamento", async (req, res) => {
  const { id } = req.params;
  const { forma_pagamento } = req.body;

  if (!forma_pagamento) {
    return res.status(400).json({ erro: "Forma de pagamento não informada." });
  }

  const { data, error } = await supabase
    .from("pedidos")
    .update({ forma_pagamento })
    .eq("id", id)
    .select();

  if (error) return res.status(500).json({ erro: error.message });

  if (!data || data.length === 0) {
    return res.status(404).json({ erro: "Pedido não encontrado." });
  }

  res.json(data[0]);
});

// LISTAR EVENTOS
app.get("/eventos", async (req, res) => {
  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .order("data_evento", { ascending: true });

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data);
});

// CRIAR EVENTO
app.post("/eventos", async (req, res) => {
  const { nome, data_evento, status } = req.body;

  if (!nome || !data_evento) {
    return res.status(400).json({ erro: "Nome e data do evento são obrigatórios." });
  }

  const { data, error } = await supabase
    .from("eventos")
    .insert([
      {
        nome,
        data_evento,
        status: status || "Aberto"
      }
    ])
    .select();

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data[0]);
});

// LISTAR PRODUTOS DE UM EVENTO
app.get("/eventos/:id/produtos", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("evento_id", id)
    .order("id", { ascending: true });

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data);
});

// CRIAR PRODUTO DENTRO DO EVENTO
app.post("/eventos/:id/produtos", async (req, res) => {
  const { id } = req.params;
  const { nome, preco } = req.body;

  if (!nome || !preco) {
    return res.status(400).json({ erro: "Nome e preço do produto são obrigatórios." });
  }

  const { data, error } = await supabase
    .from("produtos")
    .insert([
      {
        evento_id: id,
        nome,
        preco: Number(preco)
      }
    ])
    .select();

  if (error) return res.status(500).json({ erro: error.message });

  res.json(data[0]);
});

// LISTAR COMANDAS COM ITENS
app.get("/comandas", async (req, res) => {
  const { data: comandas, error: erroComandas } = await supabase
    .from("comandas")
    .select("*")
    .order("numero_comanda", { ascending: false });

  if (erroComandas) return res.status(500).json({ erro: erroComandas.message });

  const resultado = [];

  for (const comanda of comandas) {
    const { data: itens, error: erroItens } = await supabase
      .from("itens_comanda")
      .select("*, produtos(nome)")
      .eq("comanda_id", comanda.id);

    if (erroItens) return res.status(500).json({ erro: erroItens.message });

    resultado.push({
      ...comanda,
      itens
    });
  }

  res.json(resultado);
});

// CRIAR COMANDA COM VÁRIOS ITENS
app.post("/comandas", async (req, res) => {
  const { evento_id, cliente, forma_pagamento, itens } = req.body;

  if (!evento_id || !cliente || !forma_pagamento || !itens || !itens.length) {
    return res.status(400).json({ erro: "Preencha evento, cliente, pagamento e itens." });
  }

  const { data: ultima } = await supabase
    .from("comandas")
    .select("numero_comanda")
    .order("numero_comanda", { ascending: false })
    .limit(1)
    .maybeSingle();

  const novoNumero = ultima ? ultima.numero_comanda + 1 : 1;

  let totalComanda = 0;
  const itensProntos = [];

  for (const item of itens) {
    const { produto_id, quantidade } = item;

    const { data: produto, error: erroProduto } = await supabase
      .from("produtos")
      .select("*")
      .eq("id", produto_id)
      .maybeSingle();

    if (erroProduto || !produto) {
      return res.status(400).json({ erro: `Produto inválido: ${produto_id}` });
    }

    const subtotal = Number(produto.preco) * Number(quantidade);
    totalComanda += subtotal;

    itensProntos.push({
      produto_id,
      quantidade: Number(quantidade),
      preco_unitario: Number(produto.preco),
      subtotal
    });
  }

  const { data: comandaCriada, error: erroComanda } = await supabase
    .from("comandas")
    .insert([
      {
        numero_comanda: novoNumero,
        evento_id,
        cliente,
        forma_pagamento,
        status: "Pendente",
        total: totalComanda
      }
    ])
    .select()
    .maybeSingle();

  if (erroComanda || !comandaCriada) {
    return res.status(500).json({ erro: erroComanda?.message || "Erro ao criar comanda." });
  }

  const itensInsert = itensProntos.map(item => ({
    comanda_id: comandaCriada.id,
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    subtotal: item.subtotal
  }));

  const { error: erroItens } = await supabase
    .from("itens_comanda")
    .insert(itensInsert);

  if (erroItens) {
    return res.status(500).json({ erro: erroItens.message });
  }

  res.json({
    sucesso: true,
    numero_comanda: comandaCriada.numero_comanda,
    total: comandaCriada.total
  });
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});