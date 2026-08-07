import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Calculator from './Calculator';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
});

describe('Calculator Component - digit inputs', () => {
  it('handles initial digit input replacing 0', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = render(<Calculator onClose={vi.fn()} />);
    const display = container.querySelector('.text-2xl');
    
    expect(display).toHaveTextContent('0');

    const btn7 = getByRole('button', { name: '7' });
    await user.click(btn7);

    expect(display).toHaveTextContent('7');
  });

  it('handles sequential digit inputs', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = render(<Calculator onClose={vi.fn()} />);
    const display = container.querySelector('.text-2xl');

    await user.click(getByRole('button', { name: '4' }));
    await user.click(getByRole('button', { name: '2' }));
    await user.click(getByRole('button', { name: '0' }));

    expect(display).toHaveTextContent('420');
  });

  it('handles waitingForOperand state (starts a new number after an operator)', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = render(<Calculator onClose={vi.fn()} />);
    const display = container.querySelector('.text-2xl');

    await user.click(getByRole('button', { name: '5' }));
    await user.click(getByRole('button', { name: '+' }));
    
    // The display still shows '5' while waiting for operand
    expect(display).toHaveTextContent('5');

    // Entering a new digit replaces the display instead of appending
    await user.click(getByRole('button', { name: '3' }));
    expect(display).toHaveTextContent('3');

    // Sequential digits append again
    await user.click(getByRole('button', { name: '1' }));
    expect(display).toHaveTextContent('31');
  });

  it('handles decimal inputs correctly', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = render(<Calculator onClose={vi.fn()} />);
    const display = container.querySelector('.text-2xl');

    await user.click(getByRole('button', { name: '2' }));
    await user.click(getByRole('button', { name: '.' }));
    await user.click(getByRole('button', { name: '5' }));

    expect(display).toHaveTextContent('2.5');

    // Should not allow multiple decimals
    await user.click(getByRole('button', { name: '.' }));
    await user.click(getByRole('button', { name: '3' }));

    expect(display).toHaveTextContent('2.53');
  });

  it('evaluates parenthesized expressions with operator precedence', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = render(<Calculator onClose={vi.fn()} />);
    const display = container.querySelector('.text-2xl');

    await user.click(getByRole('button', { name: '(' }));
    await user.click(getByRole('button', { name: '2' }));
    await user.click(getByRole('button', { name: '+' }));
    await user.click(getByRole('button', { name: '3' }));
    await user.click(getByRole('button', { name: ')' }));
    await user.click(getByRole('button', { name: '×' }));
    await user.click(getByRole('button', { name: '4' }));
    await user.click(getByRole('button', { name: '=' }));

    expect(display).toHaveTextContent('20');
  });

  it('keeps keyboard focus trapped and closes on escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { getByRole } = render(<Calculator onClose={onClose} />);
    const dialog = getByRole('dialog', { name: 'Scientific Calculator' });
    const buttons = dialog.querySelectorAll('button');

    buttons[buttons.length - 1].focus();
    await user.keyboard('{Tab}');
    expect(buttons[0]).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
