declare global {
    namespace Express {
        interface User {
            id: string;
            email: string;
            name: string;
            role: string;
            departmentId?: string | null;
        }

        interface Request {
            user?: User;
        }
    }
}

export { };
