import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

interface KeypadButtonProps {
  value: string;
  onClick: (value: string) => void;
  children?: React.ReactNode;
  danger?: boolean;
}

const KeypadButton = ({ value, onClick, children, danger }: KeypadButtonProps) => (
  <Button
    style={{
      height: 70,
      fontSize: 28,
      fontWeight: 500,
    }}
    danger={danger}
    onClick={() => onClick(value)}
  >
    {children || value}
  </Button>
);

interface NumberKeypadProps {
  onKeyPress: (key: string) => void;
}

export default function NumberKeypad({ onKeyPress }: NumberKeypadProps) {
  const keypad = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['C', '0', 'Del'],
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        width: 320,
      }}
    >
      {keypad.flat().map((key) => (
        <KeypadButton
          key={key}
          value={key}
          onClick={onKeyPress}
          danger={key === 'C'}
        >
          {key === 'Del' ? <DeleteOutlined /> : key}
        </KeypadButton>
      ))}
    </div>
  );
}

