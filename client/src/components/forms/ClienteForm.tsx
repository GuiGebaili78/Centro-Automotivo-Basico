import { useState, useRef } from "react";
import { ClienteDataForm } from "./ClienteDataForm";
import { Button } from "../ui/Button";
import { Save } from "lucide-react";
import { ClienteService } from "../../services/cliente.service";
import { toast } from "react-toastify";

interface ClienteFormProps {
  onSuccess: (newClient: any) => void;
  onCancel: () => void;
}

export const ClienteForm = ({ onSuccess, onCancel }: ClienteFormProps) => {
  const [loading, setLoading] = useState(false);
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">("PF");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ie, setIe] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefone2, setTelefone2] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complLogradouro, setComplLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("São Paulo");
  const [, setEstado] = useState("SP"); // Only local state needed for auto-fill

  const nameRef = useRef<HTMLInputElement>(null);

  const handleCepBlur = async () => {
    const cepRaw = cep.replace(/\D/g, "");
    if (cepRaw.length === 8) {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cepRaw}/json/`,
        );
        const data = await response.json();
        if (!data.erro) {
          setLogradouro(data.logradouro);
          setBairro(data.bairro);
          setCidade(data.localidade);
          setEstado(data.uf);
          // Focus number input after auto-fill
          const numeroInput = document.getElementById("nr_logradouro");
          if (numeroInput) numeroInput.focus();
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newClient = await ClienteService.createFull({
        tipo_pessoa: tipoPessoa === "PF" ? 1 : 2,
        nome,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        cpf,
        cnpj,
        inscricao_estadual: ie,
        telefone_1: telefone,
        telefone_2: telefone2,
        email,
        logradouro,
        nr_logradouro: numero,
        compl_logradouro: complLogradouro,
        bairro,
        cidade,
        estado: "SP", // Default or form does not allow changing state easily? Added static for now in state
        cep,
      });
      toast.success("Cliente cadastrado com sucesso!");
      onSuccess(newClient);
    } catch (error: any) {
      console.error(error);
      toast.error(
        "Erro ao cadastrar cliente: " +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ClienteDataForm
        tipoPessoa={tipoPessoa}
        setTipoPessoa={setTipoPessoa}
        isEditMode={false}
        nome={nome}
        setNome={setNome}
        cpf={cpf}
        setCpf={setCpf}
        razaoSocial={razaoSocial}
        setRazaoSocial={setRazaoSocial}
        nomeFantasia={nomeFantasia}
        setNomeFantasia={setNomeFantasia}
        cnpj={cnpj}
        setCnpj={setCnpj}
        ie={ie}
        setIe={setIe}
        telefone={telefone}
        setTelefone={setTelefone}
        telefone2={telefone2}
        setTelefone2={setTelefone2}
        email={email}
        setEmail={setEmail}
        cep={cep}
        setCep={setCep}
        logradouro={logradouro}
        setLogradouro={setLogradouro}
        numero={numero}
        setNumero={setNumero}
        complLogradouro={complLogradouro}
        setComplLogradouro={setComplLogradouro}
        bairro={bairro}
        setBairro={setBairro}
        cidade={cidade}
        setCidade={setCidade}
        handleCepBlur={handleCepBlur}
        nameRef={nameRef}
      />

      <div className="flex justify-end gap-4 pt-4 border-t border-neutral-200">
        <Button variant="ghost" onClick={onCancel} type="button">
          Cancelar
        </Button>
        <Button variant="primary" type="submit" isLoading={loading} icon={Save}>
          Salvar Cliente
        </Button>
      </div>
    </form>
  );
};
