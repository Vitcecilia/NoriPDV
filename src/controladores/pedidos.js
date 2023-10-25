const knex = require("../database");

const cadastrarPedido = async (req, res) => {
    const { cliente_id, observacao, pedido_produtos, produto_id, quantidade_produto } = req.body;

    try {
        const clienteIdExiste = await knex("clientes")
            .where({id: cliente_id})
            .first();

        if (!clienteIdExiste) {
            return res.status(404).json({ mensagem: "Cliente não encontrado" });
        }

        const itensPedido = [];

        for (itemPedido of pedido_produtos) {

            const produto = await knex("produtos")
                .where({id: itemPedido.produto_id})
                .first();

            if (!produto) {
                return res.status(404).json({ mensagem: `Produto ${itemPedido.produto_id} não encontrado`});
            }
         
            if (produto.quantidade_estoque < itemPedido.quantidade_produto) {
                return res.status(404).json({ mensagem: `Não existe quantidade suficiente do produto ${produto.id} em estoque` });
            }
          
            produto.quantidade_pedido = itemPedido.quantidade_produto;
            itensPedido.push(produto);
        }


        const novoPedido = await knex("pedidos").insert({
            cliente_id,
            observacao: observacao.trim(),
            valor_total: 0
        }).returning("*");

        novoPedido[0].pedido_produtos = [];

        let valorTotal = 0;

        for (item of itensPedido) {
      
            const relacionamento = await knex("pedido_produtos").insert({
                produto_id: item.id,
                pedido_id: novoPedido[0].id,
                quantidade_produto: item.quantidade_pedido,
                valor_produto: item.valor
            }).returning("*");

            valorTotal += item.quantidade_pedido * item.valor;
            novoPedido[0].pedido_produtos.push(relacionamento[0]);
        }

        novoPedido[0].valor_total = valorTotal;

        await knex("pedidos").where({id:novoPedido[0].id}).update({
            valor_total: valorTotal
        })

        return res.status(201).json({ "Pedido criado": novoPedido[0] })
    }
    catch (error) {
        return res.status(500).json({ mensagem: error.message });
    }
}

module.exports = { cadastrarPedido };