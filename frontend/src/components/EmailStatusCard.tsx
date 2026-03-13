type EmailStatusCardProps = {
  sent: boolean;
  message: string;
};

export function EmailStatusCard({ sent, message }: EmailStatusCardProps) {
  // Email is temporarily disabled, hide this card
  return null;
}

