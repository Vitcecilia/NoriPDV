const { log } = require("console");
const knex = require("../database");
const s3 = require("../servicos/aws-sdk");

const cadastrarProduto = async (req, res) => {
  const { descricao, quantidade_estoque, valor, categoria_id, produto_imagem } = req.body;

  try {
    const categoriaExiste = await knex("categorias")
      .where({
        id: categoria_id,
      })
      .first();

    if (!categoriaExiste) {
      return res.status(404).json({ mensagem: "Categoria não existe" });
    }

    const novoProduto = await knex("produtos")
      .insert({
        descricao: descricao.trim(),
        quantidade_estoque,
        valor,
        categoria_id,
      })
      .returning("*");

    
    let urlImagem;

    if(produto_imagem){
      const arquivoSalvo = await s3.uploadArquivo(
        `imagens/produtos/${novoProduto[0].id}`,
        produto_imagem
      )
      urlImagem = arquivoSalvo.Location;
    }

    const updateProduto = await knex('produtos')
      .where({id:novoProduto[0].id})
      .update({produto_imagem: urlImagem}).returning("*");

    return res.status(201).json({ "Produto criado": updateProduto[0] });

  } catch (error) {
    return res.status(500).json({ mensagem: error.message });
  }
};

const editarProduto = async (req, res) => {
  const { descricao, quantidade_estoque, valor, categoria_id, produto_imagem } = req.body;
  const { id } = req.params;
  try {

    const produto = await knex("produtos").where({ id }).first();

    if (!produto) {
      return res.status(404).json({ mensagem: "Produto não encontrado" });
    }

    const categoriaExiste = await knex("categorias")
      .where({
        id: categoria_id,
      })
      .first();

    if (!categoriaExiste) {
      return res.status(404).json({ mensagem: "Categoria não existe" });
    }

    let urlImagem;

    if(produto_imagem){
      
      if(produto.produto_imagem){
        await s3.excluirArquivo(produto.produto_imagem);
      }
      const arquivoSalvo = await s3.uploadArquivo(
        `imagens/produtos/${produto.id}`,
        produto_imagem
      )
      urlImagem = arquivoSalvo.Location;
    }

    const produtoAtualizado = await knex("produtos")
      .update({
        descricao,
        quantidade_estoque,
        valor,
        categoria_id,
        produto_imagem:urlImagem
      })
      .where({ id })
      .returning("*");

    return res.status(201).json({ "Produto atualizado": produtoAtualizado[0] });
  }
  catch (error) {
    return res.status(500).json({ mensagem: error.message });
  }
};

const listarProdutos = async (req, res) => {
  const { categoria_id } = req.query;

  try {
    const produtos = await knex("produtos").where((query) => {
      if (categoria_id && typeof categoria_id !== "string") {
        categoria_id.forEach((item) => {
          query.orWhere({ categoria_id: item });
        });
      }
      if (categoria_id && typeof categoria_id === "string") {
        query.orWhere({ categoria_id: categoria_id });
      }
    });

    return res.status(200).json(produtos);
  } catch (error) {
    return res.status(500).json({ mensagem: error.message });
  }
};

const detalharProduto = async (req, res) => {
  const { id } = req.params;
  try {
    const produto = await knex("produtos").where({ id }).first();
    if (!produto) {
      return res.status(404).json({ mensagem: "Produto não encontrado" });
    }
    return res.status(200).json(produto);
  } catch (error) {
    return res.status(500).json({ mensagem: error.message });
  }
};

const excluirProduto = async (req, res) => {
  const { id } = req.params;
  try {
    const produto = await knex("produtos").where({ id }).select().first();
    if (!produto) {
      return res.status(404).json({ mensagem: "Produto não encontrado" });
    }

    await knex("produtos").where({ id }).delete();
    return res.status(200).json({ "Produto excluído": produto });
  } catch (error) {
    return res.status(500).json({ mensagem: error.message });
  }
};

module.exports = {
  cadastrarProduto,
  editarProduto,
  detalharProduto,
  listarProdutos,
  excluirProduto,
};
