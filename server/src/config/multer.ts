import multer from "multer";
import path from "path";
import fs from "fs";

// Usa process.cwd() para garantir consistência com o restante do projeto
// (controllers, rotas estáticas). Em Docker, __dirname pode apontar para
// dist/config/, enquanto process.cwd() sempre aponta para a raiz do serviço.
const uploadDir = path.resolve(process.cwd(), "uploads");

// Garantia de diretório: cria recursivamente se não existir.
// Sem isso, o Multer lança ENOENT em ambientes Linux/Docker onde a pasta
// não é provisionada automaticamente (diferente do Windows/dev local).
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`[Multer] Created uploads directory: ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Verificação de segurança no momento do upload (não apenas na inicialização).
    // Cobre edge-cases como volumes Docker remontados em runtime.
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`[Multer] Re-created uploads directory at runtime: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Apenas imagens são permitidas!"));
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
