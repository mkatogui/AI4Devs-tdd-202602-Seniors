import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUploader from '../FileUploader';

describe('FileUploader', () => {
    const file = new File(['hello'], 'cv.pdf', { type: 'application/pdf' });

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.fetch;
    });

    const setup = () => {
        const onChange = jest.fn();
        const onUpload = jest.fn();
        render(<FileUploader onChange={onChange} onUpload={onUpload} />);
        return { onChange, onUpload };
    };

    it('renders the file input and the upload button', () => {
        setup();
        expect(screen.getByLabelText('File')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /subir archivo/i })).toBeInTheDocument();
    });

    it('calls onChange with the selected file and shows its name', () => {
        const { onChange } = setup();
        const input = screen.getByLabelText('File');

        fireEvent.change(input, { target: { files: [file] } });

        expect(onChange).toHaveBeenCalledWith(file);
        expect(screen.getByText(/selected file: cv\.pdf/i)).toBeInTheDocument();
    });

    it('uploads the file, calls onUpload with the response, and shows the success message', async () => {
        const { onUpload } = setup();
        const responseData = { filePath: 'uploads/123-cv.pdf', fileType: 'application/pdf' };
        global.fetch.mockResolvedValueOnce({ ok: true, json: async () => responseData });

        fireEvent.change(screen.getByLabelText('File'), { target: { files: [file] } });
        fireEvent.click(screen.getByRole('button', { name: /subir archivo/i }));

        await waitFor(() => expect(onUpload).toHaveBeenCalledWith(responseData));

        const [url, init] = global.fetch.mock.calls[0];
        expect(url).toBe('http://localhost:3010/upload');
        expect(init.method).toBe('POST');
        expect(init.body).toBeInstanceOf(FormData);
        expect(init.body.get('file')).toBe(file);
        expect(await screen.findByText(/archivo subido con éxito/i)).toBeInTheDocument();
    });

    it('does nothing when the upload button is clicked without selecting a file', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: /subir archivo/i }));
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('swallows network errors but stops the loading state', async () => {
        const { onUpload } = setup();
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        global.fetch.mockResolvedValueOnce({ ok: false });

        fireEvent.change(screen.getByLabelText('File'), { target: { files: [file] } });
        fireEvent.click(screen.getByRole('button', { name: /subir archivo/i }));

        await waitFor(() => expect(errorSpy).toHaveBeenCalled());
        expect(onUpload).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: /subir archivo/i }),
        ).toBeInTheDocument();
    });
});
