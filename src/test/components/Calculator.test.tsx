import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Calculator from '../../components/Calculator';

beforeEach(() => {
    render(<Calculator />);
});

async function openCalculator() {
    await userEvent.click(screen.getByTitle('Quick Calculator'));
}

function getDisplay() {
    return document.querySelector('.truncate');
}

describe('Calculator', () => {
    it('should render toggle button', () => {
        expect(screen.getByTitle('Quick Calculator')).toBeInTheDocument();
    });

    it('should open calculator on toggle click', async () => {
        await openCalculator();
        expect(screen.getByText('Calculator')).toBeInTheDocument();
    });

    it('should display numbers when clicked', async () => {
        await openCalculator();
        await userEvent.click(screen.getByRole('button', { name: '7' }));
        await userEvent.click(screen.getByRole('button', { name: '8' }));
        await userEvent.click(screen.getByRole('button', { name: '9' }));
        expect(getDisplay()).toHaveTextContent('789');
    });

    it('should clear display on AC', async () => {
        await openCalculator();
        await userEvent.click(screen.getByRole('button', { name: '7' }));
        await userEvent.click(screen.getByText('AC'));
        expect(getDisplay()).toHaveTextContent('0');
    });

    it('should perform basic addition', async () => {
        await openCalculator();
        await userEvent.click(screen.getByRole('button', { name: '2' }));
        await userEvent.click(screen.getByRole('button', { name: '+' }));
        await userEvent.click(screen.getByRole('button', { name: '3' }));
        await userEvent.click(screen.getByRole('button', { name: '=' }));
        expect(getDisplay()).toHaveTextContent('5');
    });

    it('should perform subtraction', async () => {
        await openCalculator();
        await userEvent.click(screen.getByRole('button', { name: '1' }));
        await userEvent.click(screen.getByRole('button', { name: '0' }));
        await userEvent.click(screen.getByRole('button', { name: '-' }));
        await userEvent.click(screen.getByRole('button', { name: '4' }));
        await userEvent.click(screen.getByRole('button', { name: '=' }));
        expect(getDisplay()).toHaveTextContent('6');
    });

    it('should perform multiplication', async () => {
        await openCalculator();
        await userEvent.click(screen.getByRole('button', { name: '3' }));
        await userEvent.click(screen.getByRole('button', { name: '×' }));
        await userEvent.click(screen.getByRole('button', { name: '4' }));
        await userEvent.click(screen.getByRole('button', { name: '=' }));
        expect(getDisplay()).toHaveTextContent('12');
    });

    it('should close on Escape key', async () => {
        await openCalculator();
        expect(screen.getByText('Calculator')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByText('Calculator')).not.toBeInTheDocument();
    });

    it('should handle decimal numbers', async () => {
        await openCalculator();
        await userEvent.click(screen.getByRole('button', { name: '3' }));
        await userEvent.click(screen.getByRole('button', { name: '.' }));
        await userEvent.click(screen.getByRole('button', { name: '1' }));
        await userEvent.click(screen.getByRole('button', { name: '4' }));
        expect(getDisplay()).toHaveTextContent('3.14');
    });

    it('should prevent multiple decimals', async () => {
        await openCalculator();
        await userEvent.click(screen.getByRole('button', { name: '.' }));
        await userEvent.click(screen.getByRole('button', { name: '.' }));
        expect(getDisplay()).toHaveTextContent('0.');
    });
});
