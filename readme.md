1. Run CloudFormation stack oidc-role.yml to setup permissions for GHA
2. Run stacks
3. Use SSM to get to bastion host

# Install all dependencies
npm install

# Run frontend web server
npm run frontend

# Run backend API
npm run backend

# Deploy infrastructure
npm run deploy

# Build all packages
npm run build

# Clean all build artifacts
npm run clean