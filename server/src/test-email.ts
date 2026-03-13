import "dotenv/config";
import { EmailService } from "./services/email.service";

async function testEmail() {
  console.log("--- Teste de Integração SMTP ---");
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_USER:", process.env.SMTP_USER);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("ERRO: SMTP_USER ou SMTP_PASS não definidos no .env");
    return;
  }

  try {
    const transporter = await EmailService.getTransporter();
    
    console.log("Enviando e-mail de teste...");
    
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Teste Centro Automotivo"}" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: "Teste de Integração - Centro Automotivo",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h1 style="color: #2563eb;">Teste de Sucesso!</h1>
          <p style="font-size: 16px; color: #374151;">
            Se você recebeu este e-mail, o envio pelo <strong>Node.js</strong> está funcionando perfeitamente!
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            Enviado de: ${process.env.SMTP_HOST} via Centro Automotivo APP
          </p>
        </div>
      `,
    });

    console.log("✅ SUCESSO! E-mail enviado corretamente.");
    console.log("ID da mensagem:", info.messageId);
  } catch (error: any) {
    console.error("❌ FALHA no envio do e-mail.");
    console.error("Erro detalhado:", error.message);
    if (error.code === 'EAUTH') {
      console.error("Dica: Verifique se a 'Senha de Aplicativo' está correta e se o acesso SMTP está habilitado.");
    }
  }
}

testEmail();
