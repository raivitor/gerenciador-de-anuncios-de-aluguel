# Foto Pro - Backend

## Endpoints

### POST `/api/fotografo`

Cadastro de um novo fotógrafo.

**Body**

```json
{
  "nome": "Raí Vitor",
  "email": "rai@email.com",
  "password": "123123"
}
```

- Não é permitido e-mail duplicado e o formato do e-mail é validado.

Na inicialização da aplicação três fotógrafos fictícios são criados automaticamente e ficam prontos para realizar login.
