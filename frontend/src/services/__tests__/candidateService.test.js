import axios from 'axios';
import { uploadCV, sendCandidateData } from '../candidateService';

jest.mock('axios');

describe('candidateService', () => {
    describe('uploadCV', () => {
        it('posts the file as multipart/form-data and returns the response data', async () => {
            const file = new File(['hello'], 'cv.pdf', { type: 'application/pdf' });
            const responseData = { filePath: 'uploads/123-cv.pdf', fileType: 'application/pdf' };
            axios.post.mockResolvedValueOnce({ data: responseData });

            const result = await uploadCV(file);

            expect(result).toEqual(responseData);
            expect(axios.post).toHaveBeenCalledTimes(1);
            const [url, formData, config] = axios.post.mock.calls[0];
            expect(url).toBe('http://localhost:3010/upload');
            expect(formData).toBeInstanceOf(FormData);
            expect(formData.get('file')).toBe(file);
            expect(config).toEqual({
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        });

        it('throws when axios rejects with a response payload', async () => {
            axios.post.mockRejectedValueOnce({ response: { data: 'boom' } });
            await expect(uploadCV(new File(['x'], 'cv.pdf'))).rejects.toThrow(
                /Error al subir el archivo/,
            );
        });

        it('throws when axios rejects without a response object (gotcha)', async () => {
            axios.post.mockRejectedValueOnce(new Error('network down'));
            await expect(uploadCV(new File(['x'], 'cv.pdf'))).rejects.toThrow();
        });
    });

    describe('sendCandidateData', () => {
        it('posts the candidate JSON and returns the response data', async () => {
            const payload = { firstName: 'Ana', lastName: 'García', email: 'ana@example.com' };
            const responseData = { id: 7, ...payload };
            axios.post.mockResolvedValueOnce({ data: responseData });

            const result = await sendCandidateData(payload);

            expect(result).toEqual(responseData);
            expect(axios.post).toHaveBeenCalledWith(
                'http://localhost:3010/candidates',
                payload,
            );
        });

        it('throws when axios rejects with a response payload', async () => {
            axios.post.mockRejectedValueOnce({ response: { data: 'invalid' } });
            await expect(sendCandidateData({})).rejects.toThrow(
                /Error al enviar datos del candidato/,
            );
        });

        it('throws when axios rejects without a response object (gotcha)', async () => {
            axios.post.mockRejectedValueOnce(new Error('network down'));
            await expect(sendCandidateData({})).rejects.toThrow();
        });
    });
});
