import { AxiosError } from 'axios';

export default function filterAxiosErr(err: AxiosError): { message: string; code: string; status: string } {
    return {
        message: err.message,
        code: err.code,
        status: err.status
    };
}
