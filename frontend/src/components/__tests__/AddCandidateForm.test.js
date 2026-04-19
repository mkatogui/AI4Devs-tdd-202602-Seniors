import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddCandidateForm from '../AddCandidateForm';

jest.mock('../FileUploader', () => ({
    __esModule: true,
    default: ({ onUpload }) => (
        <button
            type="button"
            data-testid="mock-file-uploader"
            onClick={() =>
                onUpload({ filePath: 'uploads/cv.pdf', fileType: 'application/pdf' })
            }
        >
            mock upload
        </button>
    ),
}));

const fillRequiredFields = () => {
    fireEvent.change(screen.getByLabelText(/nombre/i, { selector: '[name="firstName"]' }), {
        target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByLabelText(/apellido/i), {
        target: { value: 'García' },
    });
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'ana@example.com' },
    });
};

describe('AddCandidateForm', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.fetch;
    });

    it('renders all primary form fields and the submit button', () => {
        render(<AddCandidateForm />);
        expect(screen.getByRole('heading', { name: /agregar candidato/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/nombre/i, { selector: '[name="firstName"]' })).toBeInTheDocument();
        expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^enviar$/i })).toBeInTheDocument();
    });

    it('adds and removes an education section', () => {
        render(<AddCandidateForm />);
        expect(screen.queryByPlaceholderText(/institución/i)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /añadir educación/i }));
        expect(screen.getByPlaceholderText(/institución/i)).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: /eliminar/i })[0]);
        expect(screen.queryByPlaceholderText(/institución/i)).not.toBeInTheDocument();
    });

    it('adds and removes a work experience section', () => {
        render(<AddCandidateForm />);
        expect(screen.queryByPlaceholderText(/empresa/i)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /añadir experiencia laboral/i }));
        expect(screen.getByPlaceholderText(/empresa/i)).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: /eliminar/i })[0]);
        expect(screen.queryByPlaceholderText(/empresa/i)).not.toBeInTheDocument();
    });

    it('submits to /candidates with the candidate JSON and shows the success alert on 201', async () => {
        global.fetch.mockResolvedValueOnce({ status: 201 });
        render(<AddCandidateForm />);

        fillRequiredFields();
        fireEvent.click(screen.getByTestId('mock-file-uploader'));
        fireEvent.click(screen.getByRole('button', { name: /^enviar$/i }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        const [url, init] = global.fetch.mock.calls[0];
        expect(url).toBe('http://localhost:3010/candidates');
        expect(init.method).toBe('POST');
        expect(init.headers).toEqual({ 'Content-Type': 'application/json' });

        const body = JSON.parse(init.body);
        expect(body).toMatchObject({
            firstName: 'Ana',
            lastName: 'García',
            email: 'ana@example.com',
            cv: { filePath: 'uploads/cv.pdf', fileType: 'application/pdf' },
            educations: [],
            workExperiences: [],
        });

        expect(await screen.findByText(/candidato añadido con éxito/i)).toBeInTheDocument();
    });

    it('shows an error alert when the API returns 400 with a message', async () => {
        global.fetch.mockResolvedValueOnce({
            status: 400,
            json: async () => ({ message: 'Invalid email' }),
        });
        render(<AddCandidateForm />);

        fillRequiredFields();
        fireEvent.click(screen.getByRole('button', { name: /^enviar$/i }));

        expect(
            await screen.findByText(/error al añadir candidato:.*datos inválidos: invalid email/i),
        ).toBeInTheDocument();
    });

    it('shows an error alert when the API returns 500', async () => {
        global.fetch.mockResolvedValueOnce({ status: 500 });
        render(<AddCandidateForm />);

        fillRequiredFields();
        fireEvent.click(screen.getByRole('button', { name: /^enviar$/i }));

        expect(
            await screen.findByText(/error al añadir candidato:.*error interno del servidor/i),
        ).toBeInTheDocument();
    });
});
