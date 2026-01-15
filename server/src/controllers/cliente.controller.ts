import { Request, Response } from "express";
import { ClienteRepository } from "../repositories/cliente.repository.js";

const repository = new ClienteRepository();

export class ClienteController {
  async create(req: Request, res: Response) {
    console.log("🔵 ClienteController.create - Received request");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    try {
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
      const clientes = await repository.findAll();
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Clientes" });
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
      const cliente = await repository.update(id, req.body);
      res.json(cliente);
    } catch (error) {
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

  async searchByName(req: Request, res: Response) {
    try {
      const { name } = req.query;
      if (!name || typeof name !== "string") {
        return res
          .status(400)
          .json({ error: "Name query parameter is required" });
      }
      const clientes = await repository.searchByName(name);
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: "Failed to search Clientes" });
    }
  }
}
