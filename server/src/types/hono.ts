import type { TokenPayload } from '../lib/jwt';

export type HonoEnv = {
    Variables: {
        user: TokenPayload;
    };
};
