export const getStatusStyle = (status: string) => {
  switch (status) {
    case "FINALIZADA":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
    case "PAGA_CLIENTE":
      return "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200";
    case "PRONTO PARA FINANCEIRO":
      return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
    case "ABERTA":
      return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
    case "EM_ANDAMENTO":
      return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
    case "ORCAMENTO":
      return "bg-purple-100 text-purple-700 ring-1 ring-purple-200";
    case "AGENDAMENTO":
      return "bg-orange-100 text-orange-700 ring-1 ring-orange-200";
    case "CANCELADA":
      return "bg-red-100 text-red-700 ring-1 ring-red-200";
    default:
      return "bg-gray-50 text-gray-500 ring-1 ring-gray-200";
  }
};
