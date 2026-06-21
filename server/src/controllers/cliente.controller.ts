import { Request, Response } from "express";
import { ClienteRepository } from "../repositories/cliente.repository.js";

// Função auxiliar de sanitização
function sanitizePayload(body: any) {
  if (body.cpf) body.cpf = body.cpf.replace(/\D/g, '');
  if (body.cnpj) body.cnpj = body.cnpj.replace(/\D/g, '');
  if (body.telefone_1) body.telefone_1 = body.telefone_1.replace(/\D/g, '');
  if (body.telefone_2) body.telefone_2 = body.telefone_2.replace(/\D/g, '');
  if (body.telefone_3) body.telefone_3 = body.telefone_3.replace(/\D/g, '');
  if (body.cep) body.cep = body.cep.replace(/\D/g, '');
}

const repository = new ClienteRepository();

export class ClienteController {
  async create(req: Request, res: Response) {
    console.log("🔵 ClienteController.create - Received request");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    try {
      sanitizePayload(req.body);
      const cliente = await repository.create(req.body);
      console.log("✅ ClienteController.create - Success:", cliente.id_cliente);
      res.status(201).json(cliente);
    } catch (error: any) {
      console.error("❌ ClienteController.create - Error:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
      res
        .status(400)
        .json({ error: "Failed to create Cliente", details: error.message });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Number(req.query.limit) || 20);
      const search = req.query.search ? String(req.query.search) : undefined;
      const skip = (page - 1) * limit;

      const result = await repository.findAll(skip, limit, search);
      res.json({
        data: result.data,
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch Clientes" });
    }
  }

  async findAtivos(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const ativos = await repository.findAtivos(id);
      if (!ativos) {
        return res.status(404).json({ error: "Cliente not found" });
      }
      res.json(ativos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch ativos" });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const cliente = await repository.findById(id);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente not found" });
      }
      res.json(cliente);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Cliente" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      sanitizePayload(req.body);
      const cliente = await repository.update(id, req.body);
      res.json(cliente);
    } catch (error: any) {
      if (error && error.message && error.message.includes('já cadastrado')) {
        return res.status(400).json({ error: error.message });
      }
      if (error && error.code === 'P2002') {
        return res.status(400).json({ error: 'Este CPF ou CNPJ já está cadastrado no sistema.' });
      }
      res.status(400).json({ error: "Failed to update Cliente" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      // Check if client has service orders or vehicles with service orders
      const clienteWithOS = await repository.findById(id);

      if (!clienteWithOS) {
        return res.status(404).json({ error: "Cliente não encontrado." });
      }

      // Check if client has service orders directly
      if (
        clienteWithOS &&
        clienteWithOS.ordens_de_servico &&
        clienteWithOS.ordens_de_servico.length > 0
      ) {
        return res.status(400).json({
          error:
            "Não é possível excluir cliente com ordens de serviço cadastradas.",
          message:
            "Este cliente possui ordens de serviço associadas. Não é possível excluí-lo.",
        });
      }

      // Check if client has vehicles with service orders
      if (clienteWithOS.veiculos && clienteWithOS.veiculos.length > 0) {
        // Import prisma to check each vehicle
        const { prisma } = await import("../prisma.js");

        for (const veiculo of clienteWithOS.veiculos) {
          const veiculoWithOS = await prisma.veiculo.findUnique({
            where: { id_veiculo: veiculo.id_veiculo },
            include: { ordens_de_servico: true },
          });

          if (
            veiculoWithOS &&
            veiculoWithOS.ordens_de_servico &&
            veiculoWithOS.ordens_de_servico.length > 0
          ) {
            return res.status(400).json({
              error:
                "Não é possível excluir cliente com veículos vinculados a ordens de serviço.",
              message: `O veículo ${veiculoWithOS.placa} possui ordens de serviço associadas. Não é possível excluir o cliente.`,
            });
          }
        }

        // Delete all vehicles without OS
        await prisma.veiculo.deleteMany({
          where: { id_cliente: id },
        });
      }

      await repository.delete(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting cliente:", error);
      res.status(400).json({
        error: "Failed to delete Cliente",
        message: error.message || "Unknown error",
        details: error.code || "",
      });
    }
  }


}
