import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('Error: JWT_SECRET is not set');
  process.exit(1);
}

/** Default token lifetime for `npm run token` */
const DEFAULT_EXPIRES_IN = '30d';

const args = process.argv.slice(2);
const sub = args[args.indexOf('--sub') + 1] ?? 'dev-user';
const expArg = args[args.indexOf('--exp') + 1];
const expiresIn: string | number = expArg
  ? /^\d+$/.test(expArg)
    ? parseInt(expArg, 10)
    : expArg
  : DEFAULT_EXPIRES_IN;

const token = jwt.sign({ sub }, secret, { expiresIn });

const decoded = jwt.decode(token);
if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
  const exp = new Date((decoded.exp as number) * 1000);
  console.error(`Token expires: ${exp.toISOString()} (sub: ${sub})`);
}

console.log(token);
