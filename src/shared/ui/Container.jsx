export default function Container({ className = '', children }) {
  return <div className={`mx-auto w-full max-w-[1488px] px-4 sm:px-6 ${className}`}>{children}</div>
}
