/** Google's four-color G, drawn inline so the button needs no remote asset. */
export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.6-9.5 6.6-16.5Z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.6c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.7 28c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.7l7.4-5.7Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.9c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.3 30 2 24 2 15.4 2 7.9 6.9 4.3 14.3l7.4 5.7C13.4 14.8 18.3 10.9 24 10.9Z"
      />
    </svg>
  );
}
