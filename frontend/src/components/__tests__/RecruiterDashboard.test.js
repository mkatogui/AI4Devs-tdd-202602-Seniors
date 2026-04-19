import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecruiterDashboard from '../RecruiterDashboard';

const routerFutureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
};

const renderInRouter = () =>
    render(
        <MemoryRouter future={routerFutureFlags}>
            <RecruiterDashboard />
        </MemoryRouter>,
    );

describe('RecruiterDashboard', () => {
    it('renders the dashboard heading', () => {
        renderInRouter();
        expect(
            screen.getByRole('heading', { name: /dashboard del reclutador/i }),
        ).toBeInTheDocument();
    });

    it('renders the LTI logo with alt text', () => {
        renderInRouter();
        expect(screen.getByAltText('LTI Logo')).toBeInTheDocument();
    });

    it('renders a link pointing to /add-candidate', () => {
        renderInRouter();
        const link = screen.getByRole('link', { name: /añadir nuevo candidato/i });
        expect(link).toHaveAttribute('href', '/add-candidate');
    });
});
