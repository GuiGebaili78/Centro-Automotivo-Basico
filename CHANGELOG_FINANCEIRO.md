# Summary of Changes

## 1. Operational Flow (Ordem de Serviço)
- **Fast OS Creation**: implemented search by Vehicle Plate.
  - If found: automatic population of Client and Vehicle data.
  - If not found: rapid modal-based registration for Person/Client and Vehicle.
- **Items Management**:
  - Added "Gerenciar Itens" in OS List.
  - Modal to add parts/services to an OS.
  - Automatic calculation of Totals (Parts + Labor).
  - **Finish Service**: Button to finalize OS, locks status to 'FINALIZADA'.

## 2. Financial Management
- **Fechamento Financeiro**:
  - New page to calculate Real Costs of a finalized OS.
  - Input real cost per item and associate with a Supplier.
  - Updates OS status to 'PAGA_CLIENTE' after closing.
- **Conciliação de Pagamentos**:
  - `PagamentoPecaPage` refactored to list pending payments to suppliers.
  - "Baixar" button to mark payments as complete.
  - Filter by Supplier and Status (Pending/Paid).

## 3. Dashboard (Home)
- **KPIs Implemented**:
  - Total Clients.
  - Services in Progress (OS Open/In Progress).
  - Ready for Finance (OS Finalized).
  - Pending Supplier Payments.
- **Quick Actions**: Navigation shortcuts added.

## 4. Backend Updates
- **New Entities**: `Fornecedor`, `FechamentoFinanceiro`, `PagamentoPeca`.
- **New Routes/Controllers**: 
  - `GET /veiculo/placa/:placa`
  - `GET /itens-os/os/:id_os`
  - CRUDs for new entities.

# Database Migration Instructions

Since new tables and fields were added to the Prisma Schema, you must run the migration to update your database structure.

1. Stop the running server (if applicable).
2. Open a terminal in the `server` directory.
3. Run the following command:
   ```bash
   npx prisma migrate dev --name init_v3_financeiro
   ```
4. Restart the server:
   ```bash
   npm run dev
   ```

# Mobile Responsiveness
The new pages use responsive Tailwind classes (`grid-cols-1 md:grid-cols-2`). Tables are wrapped in `overflow-x-auto` to prevent breaking layouts on small screens.
