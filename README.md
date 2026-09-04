# Yarn Inventory Management

A multi-tenant Yarn Inventory Management application built around the notebook workflow: Quality → Stock Entry → Beam Ready → Inventory, with Party/Company/Quality analytics.

## Highlights
- Company registration + secure login
- Owner / Admin / Staff roles
- Company-isolated MongoDB data
- JWT access + refresh sessions with logout/revocation
- Password hashing with bcrypt
- Helmet + API rate limiting
- Quality / Party / Company master data
- Quality Excel import
- Stock entry with shade and lot tracking
- Beam production with automatic formula: `(Ends × Meter × Final Denier) / 9,000,000`
- Source-stock inventory protection
- Dashboard with clickable quality inventory cards
- Beam-level and source-stock traceability
- Party, Company and Quality analysis
- Mobile-first responsive UI with horizontal data tables
- Number inputs hide browser spinner controls
- Pipes stored as text

## Local setup
### API
```bash
cd server
npm install
cp .env.example .env
# set strong JWT secrets and MongoDB URI
npm run seed
npm run dev
```

### Web
```bash
cd client
npm install
npm run dev
```

Open the Vite URL. The default API is `http://localhost:5000/api`.

### Demo account
`owner@demoyarn.local` / `ChangeMe123`

Change the demo password before using outside local development.

## Security notes
The API scopes all operational records to the authenticated `companyId`, validates company/quality/party references, checks user and company status on requests, hashes passwords, supports refresh-session revocation on logout, applies Helmet and auth rate limiting, and uses role guards for administrative operations.

For a production deployment, put the API behind HTTPS, use strong secret values, configure a strict `CLIENT_URL`, add a managed MongoDB cluster with backups, and move refresh tokens to secure httpOnly cookies if the deployment architecture permits it.
