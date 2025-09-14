import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { find } from '../../../utils/database';
import { USERS_COLLECTION } from '../../../utils/constants';

const providers = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      try {
        const users = await find(USERS_COLLECTION, { email: credentials.email });
        const user = users[0];

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id,
          email: user.email,
          name: user.name,
        };
      } catch (error) {
        console.error('Auth error:', error);
        return null;
      }
    }
  })
];

export const authOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-key',
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.userId = token.sub;
      }
      return session;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
};

export default NextAuth(authOptions);
