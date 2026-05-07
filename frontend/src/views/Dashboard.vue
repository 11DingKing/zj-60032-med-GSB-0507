<template>
  <div class="dashboard-container">
    <h1 class="dashboard-title">📊 数据看板</h1>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalAppointments || 0 }}</div>
        <div class="stat-label">总预约数</div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #409eff;">
        <div class="stat-value" style="color: #409eff;">{{ stats.todayAppointments || 0 }}</div>
        <div class="stat-label">今日预约</div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #67c23a;">
        <div class="stat-value" style="color: #67c23a;">{{ stats.totalDoctors || 0 }}</div>
        <div class="stat-label">医生总数</div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #e6a23c;">
        <div class="stat-value" style="color: #e6a23c;">{{ stats.totalPatients || 0 }}</div>
        <div class="stat-label">患者总数</div>
      </div>
    </div>

    <div class="chart-row">
      <el-card class="chart-card">
        <template #header>
          <span class="chart-title">📈 各科室预约量</span>
        </template>
        <div ref="departmentChartRef" class="chart-container"></div>
      </el-card>

      <el-card class="chart-card">
        <template #header>
          <span class="chart-title">📅 每日预约趋势（近30天）</span>
        </template>
        <div ref="trendChartRef" class="chart-container"></div>
      </el-card>
    </div>

    <div class="chart-row">
      <el-card class="chart-card">
        <template #header>
          <span class="chart-title">🏆 医生好评率排行榜</span>
        </template>
        <div ref="rankingChartRef" class="chart-container"></div>
      </el-card>

      <el-card class="chart-card">
        <template #header>
          <span class="chart-title">🥧 预约状态分布</span>
        </template>
        <div ref="statusChartRef" class="chart-container"></div>
      </el-card>
    </div>

    <div v-if="loading" class="loading-overlay">
      <i class="el-icon-loading" style="font-size: 48px;"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { dashboardApi } from '@/api'

const departmentChartRef = ref<HTMLElement>()
const trendChartRef = ref<HTMLElement>()
const rankingChartRef = ref<HTMLElement>()
const statusChartRef = ref<HTMLElement>()

const loading = ref(false)
const stats = ref({
  totalAppointments: 0,
  todayAppointments: 0,
  totalDoctors: 0,
  totalPatients: 0,
})

let departmentChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null
let rankingChart: echarts.ECharts | null = null
let statusChart: echarts.ECharts | null = null

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    PENDING: '待确认',
    CONFIRMED: '已确认',
    IN_PROGRESS: '就诊中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    REJECTED: '已拒绝',
  }
  return texts[status] || status
}

const initCharts = () => {
  if (departmentChartRef.value) {
    departmentChart = echarts.init(departmentChartRef.value)
  }
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (rankingChartRef.value) {
    rankingChart = echarts.init(rankingChartRef.value)
  }
  if (statusChartRef.value) {
    statusChart = echarts.init(statusChartRef.value)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const [
      statsRes,
      deptRes,
      trendRes,
      rankingRes,
      statusRes,
    ] = await Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getAppointmentsByDepartment(),
      dashboardApi.getDailyTrend(30),
      dashboardApi.getDoctorRanking(10),
      dashboardApi.getStatusDistribution(),
    ])

    stats.value = statsRes.data

    if (departmentChart) {
      const deptData = deptRes.data || []
      departmentChart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: deptData.map((d: any) => d.departmentName || d.name),
          axisLabel: {
            rotate: 30,
            interval: 0,
          },
        },
        yAxis: {
          type: 'value',
          name: '预约数',
        },
        series: [
          {
            name: '预约量',
            type: 'bar',
            data: deptData.map((d: any) => d.count || 0),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#409eff' },
                { offset: 1, color: '#667eea' },
              ]),
            },
            barWidth: '40%',
          },
        ],
      })
    }

    if (trendChart) {
      const trendData = trendRes.data || []
      trendChart.setOption({
        tooltip: {
          trigger: 'axis',
        },
        legend: {
          data: ['预约数'],
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: trendData.map((d: any) => d.date),
          axisLabel: {
            rotate: 45,
            interval: Math.floor(trendData.length / 6),
          },
        },
        yAxis: {
          type: 'value',
          name: '预约数',
        },
        series: [
          {
            name: '预约数',
            type: 'line',
            smooth: true,
            data: trendData.map((d: any) => d.count || 0),
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
                { offset: 1, color: 'rgba(102, 126, 234, 0.05)' },
              ]),
            },
            lineStyle: {
              color: '#667eea',
              width: 2,
            },
            itemStyle: {
              color: '#667eea',
            },
          },
        ],
      })
    }

    if (rankingChart) {
      const rankingData = rankingRes.data || []
      rankingChart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: any) => {
            const data = params[0]
            const rating = rankingData.find((d: any) => d.doctorName === data.name)?.rating || 0
            return `${data.name}<br/>好评率: ${rating.toFixed(1)}分<br/>评价数: ${data.value}条`
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'value',
          name: '评价数',
        },
        yAxis: {
          type: 'category',
          data: rankingData.map((d: any) => d.doctorName).reverse(),
        },
        series: [
          {
            name: '评价数',
            type: 'bar',
            data: rankingData.map((d: any) => d.reviewCount || 0).reverse(),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#67c23a' },
                { offset: 1, color: '#95de64' },
              ]),
            },
          },
        ],
      })
    }

    if (statusChart) {
      const statusData = statusRes.data || []
      statusChart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          right: '5%',
          top: 'center',
          formatter: (name: string) => getStatusText(name),
        },
        series: [
          {
            name: '预约状态',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2,
            },
            label: {
              show: true,
              formatter: (params: any) => {
                return `${getStatusText(params.name)}: ${params.value}`
              },
              position: 'outside',
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold',
              },
            },
            labelLine: {
              show: true,
            },
            data: statusData.map((d: any) => ({
              name: d.status,
              value: d.count,
            })),
          },
        ],
        color: ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#00d4ff'],
      })
    }
  } catch (error) {
    console.error('获取数据看板数据失败:', error)
  } finally {
    loading.value = false
  }
}

const handleResize = () => {
  departmentChart?.resize()
  trendChart?.resize()
  rankingChart?.resize()
  statusChart?.resize()
}

onMounted(() => {
  nextTick(() => {
    initCharts()
    fetchData()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  departmentChart?.dispose()
  trendChart?.dispose()
  rankingChart?.dispose()
  statusChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 24px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background-color: #fff;
  padding: 24px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #667eea;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 1024px) {
  .chart-row {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  min-height: 400px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-container {
  height: 350px;
  width: 100%;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
</style>
