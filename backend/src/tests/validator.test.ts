import { validateCandidateData } from '../application/validator';

const makeValidPayload = () => ({
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    phone: '612345678',
    address: 'Calle Mayor 1',
    educations: [] as any[],
    workExperiences: [] as any[],
    cv: {} as Record<string, unknown>,
});

const makeValidEducation = () => ({
    institution: 'UC3M',
    title: 'Computer Science',
    startDate: '2006-12-31',
    endDate: '2010-12-26',
});

const makeValidExperience = () => ({
    company: 'Coca Cola',
    position: 'SWE',
    description: 'Backend work',
    startDate: '2011-01-13',
    endDate: '2013-01-17',
});

describe('validateCandidateData', () => {
    describe('edit-mode bypass', () => {
        it('returns without throwing when data.id is set, regardless of other fields', () => {
            expect(() =>
                validateCandidateData({ id: 1, firstName: '', email: 'not-an-email' }),
            ).not.toThrow();
        });
    });

    describe('name', () => {
        it('accepts a valid unicode name with accents', () => {
            const data = { ...makeValidPayload(), firstName: 'José', lastName: 'Núñez' };
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('throws "Invalid name" when firstName is missing', () => {
            const data = { ...makeValidPayload(), firstName: '' };
            expect(() => validateCandidateData(data)).toThrow('Invalid name');
        });

        it('throws "Invalid name" when name is 1 character (too short)', () => {
            const data = { ...makeValidPayload(), firstName: 'A' };
            expect(() => validateCandidateData(data)).toThrow('Invalid name');
        });

        it('throws "Invalid name" when name exceeds 100 characters', () => {
            const data = { ...makeValidPayload(), firstName: 'A'.repeat(101) };
            expect(() => validateCandidateData(data)).toThrow('Invalid name');
        });

        it('throws "Invalid name" when name contains a digit', () => {
            const data = { ...makeValidPayload(), firstName: 'Ana1' };
            expect(() => validateCandidateData(data)).toThrow('Invalid name');
        });

        it('validates lastName the same way as firstName', () => {
            const data = { ...makeValidPayload(), lastName: 'García2' };
            expect(() => validateCandidateData(data)).toThrow('Invalid name');
        });
    });

    describe('email', () => {
        it('accepts a valid email', () => {
            const data = { ...makeValidPayload(), email: 'a.b+test@sub.example.co' };
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('throws "Invalid email" when email is missing', () => {
            const data = { ...makeValidPayload(), email: '' };
            expect(() => validateCandidateData(data)).toThrow('Invalid email');
        });

        it('throws "Invalid email" when email is missing the @', () => {
            const data = { ...makeValidPayload(), email: 'anaexample.com' };
            expect(() => validateCandidateData(data)).toThrow('Invalid email');
        });

        it('throws "Invalid email" when email is missing the TLD', () => {
            const data = { ...makeValidPayload(), email: 'ana@example' };
            expect(() => validateCandidateData(data)).toThrow('Invalid email');
        });
    });

    describe('phone (Spain mobile/landline)', () => {
        it('accepts an empty phone (optional field)', () => {
            const data = { ...makeValidPayload(), phone: '' };
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('accepts a valid 9-digit phone starting with 6', () => {
            const data = { ...makeValidPayload(), phone: '612345678' };
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('throws "Invalid phone" when phone starts with 5', () => {
            const data = { ...makeValidPayload(), phone: '512345678' };
            expect(() => validateCandidateData(data)).toThrow('Invalid phone');
        });

        it('throws "Invalid phone" when phone is too short', () => {
            const data = { ...makeValidPayload(), phone: '61234567' };
            expect(() => validateCandidateData(data)).toThrow('Invalid phone');
        });

        it('throws "Invalid phone" when phone is too long', () => {
            const data = { ...makeValidPayload(), phone: '6123456789' };
            expect(() => validateCandidateData(data)).toThrow('Invalid phone');
        });
    });

    describe('address', () => {
        it('accepts an empty address (optional field)', () => {
            const data = { ...makeValidPayload(), address: '' };
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('throws "Invalid address" when address exceeds 100 characters', () => {
            const data = { ...makeValidPayload(), address: 'A'.repeat(101) };
            expect(() => validateCandidateData(data)).toThrow('Invalid address');
        });
    });

    describe('education', () => {
        it('accepts a valid education entry', () => {
            const data = { ...makeValidPayload(), educations: [makeValidEducation()] };
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('throws "Invalid institution" when institution is missing', () => {
            const data = {
                ...makeValidPayload(),
                educations: [{ ...makeValidEducation(), institution: '' }],
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid institution');
        });

        it('throws "Invalid title" when title is missing', () => {
            const data = {
                ...makeValidPayload(),
                educations: [{ ...makeValidEducation(), title: '' }],
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid title');
        });

        it('throws "Invalid date" when startDate uses the wrong format', () => {
            const data = {
                ...makeValidPayload(),
                educations: [{ ...makeValidEducation(), startDate: '2024/01/01' }],
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid date');
        });

        it('throws "Invalid end date" when endDate is malformed', () => {
            const data = {
                ...makeValidPayload(),
                educations: [{ ...makeValidEducation(), endDate: '2024/01/01' }],
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid end date');
        });

        it('accepts an education entry without endDate', () => {
            const { endDate, ...educationWithoutEnd } = makeValidEducation();
            const data = { ...makeValidPayload(), educations: [educationWithoutEnd] };
            expect(() => validateCandidateData(data)).not.toThrow();
        });
    });

    describe('work experience', () => {
        it('accepts a valid work experience entry', () => {
            const data = { ...makeValidPayload(), workExperiences: [makeValidExperience()] };
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('throws "Invalid company" when company is missing', () => {
            const data = {
                ...makeValidPayload(),
                workExperiences: [{ ...makeValidExperience(), company: '' }],
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid company');
        });

        it('throws "Invalid position" when position is missing', () => {
            const data = {
                ...makeValidPayload(),
                workExperiences: [{ ...makeValidExperience(), position: '' }],
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid position');
        });

        it('throws "Invalid description" when description exceeds 200 characters', () => {
            const data = {
                ...makeValidPayload(),
                workExperiences: [{ ...makeValidExperience(), description: 'x'.repeat(201) }],
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid description');
        });

        it('throws "Invalid date" when startDate uses the wrong format', () => {
            const data = {
                ...makeValidPayload(),
                workExperiences: [{ ...makeValidExperience(), startDate: '2024-1-1' }],
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid date');
        });

        it('throws "Invalid end date" when endDate is malformed', () => {
            const data = {
                ...makeValidPayload(),
                workExperiences: [{ ...makeValidExperience(), endDate: '2024-1-1' }],
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid end date');
        });
    });

    describe('CV', () => {
        it('accepts an empty cv object (skipped by length guard)', () => {
            const data = { ...makeValidPayload(), cv: {} };
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('accepts a valid cv with filePath and fileType strings', () => {
            const data = {
                ...makeValidPayload(),
                cv: { filePath: 'uploads/x.pdf', fileType: 'application/pdf' },
            };
            expect(() => validateCandidateData(data)).not.toThrow();
        });

        it('throws "Invalid CV data" when fileType is missing', () => {
            const data = { ...makeValidPayload(), cv: { filePath: 'uploads/x.pdf' } };
            expect(() => validateCandidateData(data)).toThrow('Invalid CV data');
        });

        it('throws "Invalid CV data" when filePath is not a string', () => {
            const data = {
                ...makeValidPayload(),
                cv: { filePath: 123, fileType: 'application/pdf' },
            };
            expect(() => validateCandidateData(data)).toThrow('Invalid CV data');
        });
    });
});
