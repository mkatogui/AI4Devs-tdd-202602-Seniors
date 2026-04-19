/**
 * Tests iniciales — recepción de formulario y persistencia (LTI ATS)
 *
 * Estas pruebas unitarias cubren la inserción de candidatos en dos familias:
 *
 *   Familia 1 — Recepción y validación de los datos del formulario:
 *     · El controller (addCandidateController) reenvía el body al servicio y
 *       devuelve la respuesta esperada (201 + payload, o 400 + mensaje).
 *     · El servicio (addCandidate) delega en validateCandidateData y rechaza
 *       payloads inválidos (campos requeridos, formatos de email/phone/fecha).
 *     · Se acepta payload válido tanto sin como con datos anidados (educations,
 *       workExperiences, cv).
 *
 *   Familia 2 — Persistencia (Prisma mockeado):
 *     · Se llama a prisma.candidate.create con los campos correctamente mapeados.
 *     · Se persisten education / workExperience / resume cuando llegan, con
 *       el candidateId devuelto por la creación del candidato.
 *     · No se invocan los creadores anidados cuando no hay datos.
 *     · Se devuelve la entidad creada por Prisma.
 *     · Se traduce el error P2002 (constraint único) al mensaje
 *       "The email already exists in the database".
 *     · Otros errores de Prisma se propagan tal cual.
 *
 * Suposiciones (declaradas explícitamente):
 *   - addCandidateController existe y está exportado en
 *     presentation/controllers/candidateController.ts, aunque hoy las rutas
 *     llaman directamente a addCandidate del servicio. Se prueba como unidad
 *     porque el código es público y forma parte del contrato.
 *   - El servicio crea el candidato primero y después itera por los hijos
 *     (este es el comportamiento actual del código).
 *
 * Estrategia de mocking:
 *   - Cada modelo del dominio instancia su propio PrismaClient en el módulo,
 *     así que mockeamos `@prisma/client` con un factory que devuelve
 *     siempre la misma instancia de jest-mock-extended.mockDeep().
 *     Así todas las llamadas a `new PrismaClient()` comparten el mismo mock
 *     y podemos aserciones al nivel de Prisma.
 */

import { mockReset, DeepMockProxy } from 'jest-mock-extended';

jest.mock('@prisma/client', () => {
    const { mockDeep } = require('jest-mock-extended');
    const sharedMock = mockDeep();
    class PrismaClientInitializationError extends Error {}
    return {
        PrismaClient: jest.fn(() => sharedMock),
        Prisma: { PrismaClientInitializationError },
    };
});

import { PrismaClient } from '@prisma/client';
import * as candidateService from '../application/services/candidateService';
import { addCandidateController } from '../presentation/controllers/candidateController';

const prismaMock = new PrismaClient() as unknown as DeepMockProxy<PrismaClient>;

const makeValidPayload = () => ({
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    phone: '612345678',
    address: 'Calle Mayor 1',
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

const makeMockRes = () =>
    ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    } as any);

beforeEach(() => {
    mockReset(prismaMock);
});

describe('Family 1 — Reception and validation of form data', () => {
    describe('Controller (addCandidateController)', () => {
        it('forwards the request body to the service and responds 201 with the created candidate', async () => {
            // Arrange
            const payload = makeValidPayload();
            const created = { id: 1, ...payload };
            const serviceSpy = jest
                .spyOn(candidateService, 'addCandidate')
                .mockResolvedValue(created as any);
            const req = { body: payload } as any;
            const res = makeMockRes();

            // Act
            await addCandidateController(req, res);

            // Assert
            expect(serviceSpy).toHaveBeenCalledWith(payload);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Candidate added successfully',
                    data: created,
                }),
            );

            serviceSpy.mockRestore();
        });

        it('responds 400 with the error message when the service throws', async () => {
            const serviceSpy = jest
                .spyOn(candidateService, 'addCandidate')
                .mockRejectedValue(new Error('Invalid email'));
            const res = makeMockRes();

            await addCandidateController({ body: {} } as any, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Error adding candidate',
                    error: 'Invalid email',
                }),
            );

            serviceSpy.mockRestore();
        });
    });

    describe('Service input validation (addCandidate)', () => {
        it('rejects when firstName is missing', async () => {
            const { firstName, ...payload } = makeValidPayload();
            await expect(candidateService.addCandidate(payload)).rejects.toThrow(/Invalid name/);
            expect(prismaMock.candidate.create).not.toHaveBeenCalled();
        });

        it('rejects when lastName is missing', async () => {
            const { lastName, ...payload } = makeValidPayload();
            await expect(candidateService.addCandidate(payload)).rejects.toThrow(/Invalid name/);
        });

        it('rejects when email is missing', async () => {
            const { email, ...payload } = makeValidPayload();
            await expect(candidateService.addCandidate(payload)).rejects.toThrow(/Invalid email/);
        });

        it('rejects when email format is malformed', async () => {
            const payload = { ...makeValidPayload(), email: 'not-an-email' };
            await expect(candidateService.addCandidate(payload)).rejects.toThrow(/Invalid email/);
        });

        it('rejects when phone format is invalid (Spain regex)', async () => {
            const payload = { ...makeValidPayload(), phone: '123456789' };
            await expect(candidateService.addCandidate(payload)).rejects.toThrow(/Invalid phone/);
        });

        it('rejects when an education startDate is malformed', async () => {
            const payload = {
                ...makeValidPayload(),
                educations: [{ ...makeValidEducation(), startDate: '2024/01/01' }],
            };
            await expect(candidateService.addCandidate(payload)).rejects.toThrow(/Invalid date/);
        });

        it('accepts a valid payload without nested data', async () => {
            prismaMock.candidate.create.mockResolvedValue({ id: 1, ...makeValidPayload() } as any);
            await expect(candidateService.addCandidate(makeValidPayload())).resolves.toMatchObject({
                id: 1,
            });
        });

        it('accepts a valid payload that includes educations, workExperiences, and cv', async () => {
            prismaMock.candidate.create.mockResolvedValue({ id: 7, ...makeValidPayload() } as any);
            prismaMock.education.create.mockResolvedValue({ id: 1 } as any);
            prismaMock.workExperience.create.mockResolvedValue({ id: 1 } as any);
            prismaMock.resume.create.mockResolvedValue({ id: 1 } as any);

            const payload = {
                ...makeValidPayload(),
                educations: [makeValidEducation()],
                workExperiences: [makeValidExperience()],
                cv: { filePath: 'uploads/x.pdf', fileType: 'application/pdf' },
            };

            await expect(candidateService.addCandidate(payload)).resolves.toMatchObject({ id: 7 });
        });
    });
});

describe('Family 2 — Saving into the database (Prisma)', () => {
    it('calls prisma.candidate.create with the mapped candidate fields', async () => {
        prismaMock.candidate.create.mockResolvedValue({ id: 42, ...makeValidPayload() } as any);

        await candidateService.addCandidate(makeValidPayload());

        expect(prismaMock.candidate.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.candidate.create).toHaveBeenCalledWith({
            data: {
                firstName: 'Ana',
                lastName: 'García',
                email: 'ana@example.com',
                phone: '612345678',
                address: 'Calle Mayor 1',
            },
        });
    });

    it('persists each education with the candidateId returned by candidate.create', async () => {
        prismaMock.candidate.create.mockResolvedValue({ id: 99, ...makeValidPayload() } as any);
        prismaMock.education.create.mockResolvedValue({ id: 1 } as any);

        const payload = {
            ...makeValidPayload(),
            educations: [makeValidEducation()],
        };

        await candidateService.addCandidate(payload);

        expect(prismaMock.education.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.education.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                institution: 'UC3M',
                title: 'Computer Science',
                candidateId: 99,
            }),
        });
    });

    it('persists each work experience with the candidateId', async () => {
        prismaMock.candidate.create.mockResolvedValue({ id: 50, ...makeValidPayload() } as any);
        prismaMock.workExperience.create.mockResolvedValue({ id: 1 } as any);

        const payload = {
            ...makeValidPayload(),
            workExperiences: [makeValidExperience()],
        };

        await candidateService.addCandidate(payload);

        expect(prismaMock.workExperience.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.workExperience.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                company: 'Coca Cola',
                position: 'SWE',
                candidateId: 50,
            }),
        });
    });

    it('persists the resume when cv is provided with filePath and fileType', async () => {
        prismaMock.candidate.create.mockResolvedValue({ id: 60, ...makeValidPayload() } as any);
        prismaMock.resume.create.mockResolvedValue({ id: 1 } as any);

        const payload = {
            ...makeValidPayload(),
            cv: { filePath: 'uploads/cv.pdf', fileType: 'application/pdf' },
        };

        await candidateService.addCandidate(payload);

        expect(prismaMock.resume.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.resume.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                candidateId: 60,
                filePath: 'uploads/cv.pdf',
                fileType: 'application/pdf',
            }),
        });
    });

    it('does NOT call education / workExperience / resume creators when no nested data is provided', async () => {
        prismaMock.candidate.create.mockResolvedValue({ id: 1, ...makeValidPayload() } as any);

        await candidateService.addCandidate(makeValidPayload());

        expect(prismaMock.education.create).not.toHaveBeenCalled();
        expect(prismaMock.workExperience.create).not.toHaveBeenCalled();
        expect(prismaMock.resume.create).not.toHaveBeenCalled();
    });

    it('returns the candidate created by prisma.candidate.create', async () => {
        const created = { id: 1, ...makeValidPayload() };
        prismaMock.candidate.create.mockResolvedValue(created as any);

        const result = await candidateService.addCandidate(makeValidPayload());

        expect(result).toEqual(created);
    });

    it('translates Prisma P2002 (unique constraint) into "The email already exists in the database"', async () => {
        prismaMock.candidate.create.mockRejectedValue({ code: 'P2002' });

        await expect(candidateService.addCandidate(makeValidPayload())).rejects.toThrow(
            'The email already exists in the database',
        );
    });

    it('propagates other Prisma errors unchanged', async () => {
        prismaMock.candidate.create.mockRejectedValue(new Error('connection refused'));

        await expect(candidateService.addCandidate(makeValidPayload())).rejects.toThrow(
            'connection refused',
        );
    });
});
