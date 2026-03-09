import ReactECharts from "echarts-for-react";

const ECHARTS_COLORS = [
  "#0b5cab",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

export function InsightPieChart({ data, name, donut = false }) {
  const chartData = data.map((d) => ({ name: d.label, value: d.count }));

  const options = {
    color: ECHARTS_COLORS,
    tooltip: {
      trigger: "item",
    },
    legend: {
      type: "scroll",
      orient: "horizontal",
      bottom: 0,
      textStyle: {
        fontFamily: "Manrope",
        color: "#5f6b7a",
        fontSize: 11,
      },
    },
    series: [
      {
        name: name,
        type: "pie",
        radius: donut ? ["45%", "70%"] : "70%",
        center: ["50%", "45%"],
        data: chartData,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.2)",
          },
        },
      },
    ],
  };

  return <ReactECharts option={options} style={{ height: "240px", width: "100%" }} />;
}

export function InsightBarChart({ data, name, horizontal = false }) {
  const categories = data.map((d) => d.label);
  const values = data.map((d) => d.count);

  const options = {
    color: ECHARTS_COLORS,
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    grid: {
      top: 10,
      left: "2%",
      right: "5%",
      bottom: "2%",
      containLabel: true,
    },
    xAxis: horizontal
      ? {
          type: "value",
          splitLine: { lineStyle: { color: "#f1f5f9" } },
          axisLabel: { fontFamily: "Manrope", color: "#5f6b7a", fontSize: 11 },
        }
      : {
          type: "category",
          data: categories,
          axisLine: { lineStyle: { color: "#d7dde6" } },
          axisLabel: { fontFamily: "Manrope", color: "#5f6b7a", fontSize: 11, interval: 0, rotate: categories.length > 5 ? 30 : 0 },
        },
    yAxis: horizontal
      ? {
          type: "category",
          data: categories,
          axisLine: { lineStyle: { color: "#d7dde6" } },
          axisLabel: { fontFamily: "Manrope", color: "#5f6b7a", fontSize: 11, width: 80, overflow: "truncate" },
        }
      : {
          type: "value",
          splitLine: { lineStyle: { color: "#f1f5f9" } },
          axisLabel: { fontFamily: "Manrope", color: "#5f6b7a", fontSize: 11 },
        },
    series: [
      {
        name: name,
        type: "bar",
        data: values,
        itemStyle: {
          borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
          color: "#0b5cab",
        },
      },
    ],
  };

  return <ReactECharts option={options} style={{ height: "240px", width: "100%" }} />;
}
