import {z} from 'zod';


export const registerSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 character long "),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 character long"),
});

export const LoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 character long"),
});