import { AxiosError } from 'axios';

export default function filterAxiosErr(err: AxiosError): {
    message: string;
    code: string;
    status: string;
    data: unknown;
} {
    return {
        message: err.message,
        code: err.code,
        status: err.status,
        data: err.response.data
    };
}
