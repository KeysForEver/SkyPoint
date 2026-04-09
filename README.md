# SkyPoint - Sistema de Registro de Ponto

SkyPoint e uma aplicacao web responsiva desenvolvida para o controle de jornada de colaboradores, integrando seguranca, precisao e facilidade de gestao em uma unica plataforma.

## Funcionalidades Principais

### Area do Colaborador
- Autenticacao segura via ID de funcionario ou conta Google.
- Registro de Entrada e Saida com interface simplificada para dispositivos moveis.
- Captura obrigatoria de foto no momento do registro para validacao biometrica.
- Captura automatica de coordenadas GPS para verificacao de localidade.
- Visualizacao de registros recentes e status de auditoria.

### Area Administrativa (RH)
- Dashboard gerencial com metricas de presenca, atrasos e ausencias em tempo real.
- Gestao de Perimetros (Geofencing): Configuracao de locais autorizados atraves de enderecos textuais com geocodificacao automatica.
- Painel de Auditoria: Identificacao e tratamento de registros divergentes (fora do perimetro ou sem foto).
- Relatorios Consolidados: Visualizacao detalhada de todos os registros com filtros por colaborador e periodo.

## Tecnologias Utilizadas

- Frontend: React 19 com TypeScript.
- Estilizacao: Tailwind CSS com design system customizado.
- Backend e Banco de Dados: Firebase (Authentication e Firestore).
- Inteligencia Artificial: Gemini API para geocodificacao de enderecos e processamento de dados.
- Iconografia: Lucide React.
- Animacoes: Motion.

## Estrutura do Projeto

- /src/components: Componentes de interface reutilizaveis e Layout principal.
- /src/lib: Configuracoes do Firebase e Contexto de Autenticacao.
- /src/pages: Telas da aplicacao (Login, Dashboards, Historico, Configuracoes).
- /src/types: Definicoes de interfaces TypeScript para o dominio do problema.
- firestore.rules: Regras de seguranca para protecao de dados no Firebase.

## Configuracao e Instalacao

1. Instale as dependencias:
   npm install

2. Inicie o servidor de desenvolvimento:
   npm run dev

3. Para producao, execute o build:
   npm run build

## Seguranca

O sistema utiliza regras de seguranca granulares no Firestore:
- Colaboradores podem ler e criar apenas seus proprios registros.
- Administradores possuem acesso total para leitura, auditoria e configuracao de perimetros.
- Validacao de esquema obrigatoria para todos os documentos criados.

## Licenca

Este projeto esta sob a licenca Apache-2.0.
