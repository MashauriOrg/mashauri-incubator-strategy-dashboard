# Mashauri Incubator Strategy Dashboard

Interactive strategy dashboard for Mashauri's entrepreneurial-education programs (universities, TTOs, research centres, scientist bootcamps).

## Sections

- **Overview** – live KPIs computed from the benchmark and diagnostic inputs.
- **Logic Model** – click-to-trace map of inputs (funding, facilities, expertise) → short-term outputs → long-term impact.
- **Benchmark vs 5 Limitations** – radar chart and sliders scoring the program against the five persistent limitations of university-led incubators: inconsistent mission, financial constraints, weak industry connections, poor entrepreneurial attitudes, low scalability.
- **Gap Diagnostic** – severity × effort scoring of 12 organizational and studentpreneur-support gaps, with quadrant chart, ranked action list and top-3 priorities.

All scores are illustrative defaults; replace them with real program data.

## Running locally

Static site, no build step. Open `index.html` in a browser, or serve the folder:

```
npx serve .
```

Uses Chart.js 4.4.4 (CDN) and Fontshare fonts (Cabinet Grotesk, General Sans).

## Sources

- Acta Commercii (2026), Investigating the efficacy of university-led business incubators – https://actacommercii.co.za/index.php/acta/article/view/1530
- Journal of Contemporary Management (2025) – https://www.tandfonline.com/doi/full/10.1080/13215906.2025.2519142
- EconStor working paper – https://www.econstor.eu/bitstream/10419/316122/1/1910566225.pdf
