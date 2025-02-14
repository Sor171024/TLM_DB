import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";
import "chart.js/auto";
import "./PowerChart.css";

const PowerChart = () => {
  const [data, setData] = useState({
    kw_ts: [],
    kw_values: [],
    kvah_values: [],
  });

  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/graph_data?days=1"); // 🔹 ดึงข้อมูลย้อนหลัง 1 วัน
        if (!response.data || typeof response.data !== "object") {
          throw new Error("Invalid data format from API (not an object)");
        }

        const kw_values = response.data.kw_values || [];
        const kvah_values = response.data.kvah_values || [];
        let kw_ts = response.data.kw_ts || [];

        // 🔹 ถ้า API ไม่ให้ timestamp → ใช้เวลาปัจจุบันและให้สอดคล้องกับค่าข้อมูล
        if (kw_ts.length === 0) {
          const now = new Date();
          kw_ts = kw_values.map((_, index) => {
            const date = new Date(now);
            date.setMinutes(
              now.getMinutes() - 5 * (kw_values.length - index - 1)
            );
            return date.toISOString();
          });
        }

        // 🔹 กรองข้อมูลภายใน 24 ชั่วโมงล่าสุด
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const filteredData = kw_ts
          .map((ts, index) => ({
            ts: new Date(ts),
            kw: kw_values[index],
            kvar: kvah_values[index],
          }))
          .filter((d) => d.ts >= oneDayAgo);

        setData({
          kw_ts: filteredData.map((d) =>
            d.ts.toLocaleString("en-GB", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })
          ),
          kw_values: filteredData.map((d) => d.kw),
          kvah_values: filteredData.map((d) => d.kvar),
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const data_label = {
    labels: data.kw_ts,
    datasets: [
      {
        label: "kW",
        data: data.kw_values,
        borderColor: "rgba(50,205,50)",
        backgroundColor: "rgba(50,205,50)",
        tension: 0.4,
        pointRadius: 1,
        pointHoverRadius: 6,
      },
      {
        label: "kVAR",
        data: data.kvah_values,
        borderColor: "rgba(27,197,189)",
        backgroundColor: "rgba(27,197,189)",
        tension: 0.4,
        pointRadius: 1,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: { usePointStyle: true },
      },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        title: { display: true },
        ticks: { maxRotation: 45, minRotation: 45 },
      },
      y: { title: { display: true }, beginAtZero: true },
    },
  };

  return (
    <div className="power-chart">
      <h3>Active vs Reactive Power</h3>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <div className="chart-container">
        <Line data={data_label} options={options} />
      </div>
    </div>
  );
};

export default PowerChart;
