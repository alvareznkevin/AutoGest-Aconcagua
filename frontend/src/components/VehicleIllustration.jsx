export default function VehicleIllustration() {
  return <svg className="vehicle-illustration" viewBox="0 0 620 240" fill="none" aria-hidden="true">
    <path d="M28 212h560" stroke="currentColor" opacity=".2" />
    <path d="M96 175 109 135q5-16 28-20l54-9 61-57q12-10 34-10h113q23 0 38 17l43 47 51 15q24 7 30 28l6 36-33 13H125Z" fill="#9cd6c6" fillOpacity=".1" stroke="#9cd6c6" strokeWidth="2" />
    <path d="m211 104 51-48q8-6 24-6h109q15 0 26 12l36 42H211Z" fill="#9cd6c6" fillOpacity=".13" stroke="#9cd6c6" strokeOpacity=".65" />
    <path d="M328 51v53m-131 16-8 54m150-59 3 59m127-63 11 35M109 151h36m383-17h23M259 122h19m87 0h19" stroke="#9cd6c6" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" />
    <path d="M121 177h29m70 0h212m74 0h41" stroke="#9cd6c6" strokeWidth="3" />
    {[185, 468].map(x => <g key={x}><circle cx={x} cy="180" r="33" fill="#132d37" stroke="#9cd6c6" strokeWidth="2" /><circle cx={x} cy="180" r="20" stroke="#9cd6c6" strokeOpacity=".45" /><circle cx={x} cy="180" r="7" fill="#9cd6c6" fillOpacity=".6" /></g>)}
    <path d="m28 82 85-22m391 12 62-17M47 106l42-11" stroke="#9cd6c6" strokeOpacity=".2" strokeLinecap="round" />
  </svg>;
}
