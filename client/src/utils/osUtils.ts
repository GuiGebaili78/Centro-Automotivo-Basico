export const getStatusStyle = (status: string) => {
  switch (status) {
    case "FINALIZADA":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
    case "FINANCEIRO":
      return "bg-orange-100 text-orange-700 ring-1 ring-orange-200";
    case "ABERTA":
      return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
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
