type IconProps = {
  className?: string;
};

export function NaverIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        fill="#03A94D"
        d="M9 32V480H181.366V255.862L331.358 480H504V32H331.358V255.862L181.366 32H9Z"
      />
    </svg>
  );
}
