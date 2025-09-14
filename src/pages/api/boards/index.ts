import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

import { BOARDS_COLLECTION } from '../../../utils/constants';
import { find, insert } from '../../../utils/database';
import { sessionReturn } from './../../../utils/interfaces';

interface postBody {
  title: string;
  bgColor: string;
  author: string;
  isPublic: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const requestType = req.method;
  const session = (await getServerSession(req, res, authOptions)) as unknown as sessionReturn;

  console.log('Session in boards API:', session);

  switch (requestType) {
    case 'POST': {
      const { title, bgColor, author, isPublic } = req.body as postBody;

      console.log('POST request body:', { title, bgColor, author, isPublic });

      if (!session) {
        console.log('No session found');
        res.status(403).send({ error: 'Not authenticated' });
        return;
      }

      if (!title) {
        res.status(400).send({ error: 'Missing title' });
        return;
      }

      const data = {
        title: title ?? 'My board',
        bgcolor: bgColor ?? 'rgb(210, 144, 52)',
        permissionList: [],
        author: session.user.userId,
        isPublic: isPublic || false,
      };
      const board = await insert(BOARDS_COLLECTION, data);
      if (board) {
        res.status(200).send({ success: board });
      } else {
        res.status(404).send({ success: false });
      }
      return;
    }

    case 'GET': {
      const { userid } = req.query;
      if (!userid) {
        res.status(400).send({ error: 'Missing user id' });
        return;
      }

      const boards = await find(
        BOARDS_COLLECTION,
        { author: String(userid) },
        ['title', 'isPublic', 'bgcolor'],
      );
      res.send(boards);
      return;
    }

    default:
      res.status(400).send({ error: 'Bad request' });
      return;
  }
}
