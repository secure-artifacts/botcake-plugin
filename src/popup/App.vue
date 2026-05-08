<template>
  <a-config-provider :theme="{ 
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: { primaryColor: '#1677ff', borderRadius: 8 } 
  }">
    <!-- 1. 全屏加载状态 -->
    <div v-if="step === 'loading'" :class="['full-screen-center', { 'dark-theme': isDarkMode }]">
      <a-spin size="large" :tip="loadingTip" />
    </div>

    <!-- 2. 登录/凭证校验拦截 -->
    <div v-else-if="step === 'login'" :class="['full-screen-center login-bg', { 'dark-theme': isDarkMode }]">
      <a-card class="login-card" :bordered="false">
        <div class="login-header">
          <div class="logo-icon"><RocketFilled /></div>
          <h2 class="title">Botcake Monitor</h2>
          <p class="subtitle">专业引流数据实时监控系统</p>
        </div>
        <div class="login-wrapper">
          <a-button type="primary" block size="large" class="action-btn sync-btn" @click="handleAutoSync">
            <template #icon><ThunderboltFilled /></template>
            自动同步浏览器凭证
          </a-button>
          <div class="login-divider">
            <span class="divider-line"></span>
            <span class="divider-text">或者手动录入凭证</span>
            <span class="divider-line"></span>
          </div>
          <div class="manual-section">
            <a-input-password v-model:value="inputToken" placeholder="请输入 token_jwt" size="large" class="manual-input" @pressEnter="saveManualToken" />
            <a-button block size="large" type="default" class="manual-btn" @click="saveManualToken">进入系统看板</a-button>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 3. 主看板界面 -->
    <div v-else :class="['dashboard-wrapper', { 'dark-theme': isDarkMode }]">
      <header class="glass-nav">
        <div class="nav-container">
          <div class="nav-left">
            <div class="brand-box">
              <BarChartOutlined class="nav-icon" />
              <span class="brand-title">实时引流监控</span>
            </div>
            <a-dropdown :trigger="['click']">
              <div class="page-pill">
                <template v-if="!isMultiMode">
                  <a-avatar :src="currentPage?.avatar" :size="24">
                    <template #icon><UserOutlined /></template>
                    {{ currentPage?.name?.charAt(0).toUpperCase() }}
                  </a-avatar>
                  <span class="page-name">{{ currentPage?.name || '选择主页' }}</span>
                </template>
                <span v-else class="page-name">{{ selectedIds.length ? `已选 ${selectedIds.length} 个主页` : '点击选择主页' }}</span>
                <DownOutlined class="arrow-down" />
              </div>
              <template #overlay v-if="!isMultiMode">
                <a-menu @click="handlePageSwitch" class="page-menu-list">
                  <a-menu-item v-for="page in pageList" :key="page.id">
                    <a-avatar :src="page.avatar" :size="20" style="margin-right: 8px" />
                    {{ page.name }}
                  </a-menu-item>
                </a-menu>
              </template>
              <template #overlay v-else>
                <a-menu class="page-menu-list" :selectable="false">
                  <a-menu-item v-for="page in pageList" :key="page.id" @click.stop="togglePageSelection(page.id)">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                      <div style="display: flex; align-items: center;">
                        <a-avatar :src="page.avatar" :size="20" style="margin-right: 8px" />
                        {{ page.name }}
                      </div>
                      <a-checkbox :checked="selectedIds.includes(page.id)" @click.stop="togglePageSelection(page.id)" />
                    </div>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
          <div class="nav-right">
            <a-button type="text" class="theme-toggle-btn" @click="toggleTheme">
              <template #icon>
                <BulbFilled v-if="isDarkMode" style="color: #fadb14" />
                <BulbOutlined v-else />
              </template>
            </a-button>
            <div class="mode-toggle">
              <span class="tz-label" style="margin-right: 8px">多选模式</span>
              <a-switch v-model:checked="isMultiMode" size="small" @change="handleModeChange" />
            </div>
            <div class="tz-group">
              <span class="tz-label">数据时区</span>
              <a-select 
                v-model:value="timezone" 
                size="small" 
                variant="borderless" 
                class="tz-select" 
                show-search
                placeholder="搜索时区"
                @change="onTzChange"
              >
                <a-select-option value="local">系统本地时间</a-select-option>
                <a-select-option v-for="tz in allTimezones" :key="tz" :value="tz">{{ tz }}</a-select-option>
              </a-select>
            </div>
            <a-button type="link" danger class="logout-btn" @click="handleLogout">退出</a-button>
          </div>
        </div>
      </header>

      <main class="main-content">
        <!-- 当日实时数据分析 -->
        <a-card :bordered="false" class="trend-card main-stats-card" v-if="!isMultiMode">
          <div class="card-head">
            <div class="title-group">
              <h3 class="trend-title">当日数据概览</h3>
              <!-- <span class="sub-hint">{{ targetDate.format('YYYY-MM-DD') }}</span> -->
            </div>
            <div class="picker-group">
              <a-radio-group v-model:value="quickDate" size="small" @change="handleQuickDate">
                <a-radio-button value="today">今天</a-radio-button>
                <a-radio-button value="yesterday">昨天</a-radio-button>
              </a-radio-group>
              <a-date-picker v-model:value="targetDate" :allow-clear="false" size="small" />
            </div>
          </div>

          <a-row :gutter="48" align="middle" class="stats-hero-row">
            <a-col :span="10">
              <div class="stat-hero">
                <div class="stat-label">当日实际新增订阅</div>
                <div class="stat-num">{{ totalCount }}</div>
              </div>
            </a-col>
            <a-col :span="14">
              <div class="gender-analysis-box">
                <div class="gender-header-row">
                  <span class="stat-label">订阅者性别比例</span>
                  <div class="gender-legend">
                    <span class="legend-item"><i class="dot female"></i>女性 - {{ genderPerc.female }}%</span>
                    <span class="legend-item"><i class="dot male"></i>男性 - {{ genderPerc.male }}%</span>
                  </div>
                </div>
                <div class="pie-container">
                  <svg viewBox="0 0 36 36" class="circular-chart">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path class="circle female-path" :stroke-dasharray="`${genderPerc.female}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div class="pie-info">
                    <div class="info-line female-text">女性：{{ genderStats.female }}个</div>
                    <div class="info-line male-text">男性：{{ genderStats.male }}个</div>
                  </div>
                </div>
              </div>
            </a-col>
          </a-row>

          <!-- 当日小时分布趋势图 -->
          <div class="chart-container" style="margin-top: 40px">
            <div class="chart-main">
              <div class="y-axis">
                <span v-for="i in 6" :key="i">
                  {{ maxVal > 0 ? Math.round(maxVal * (6 - i) / 5) : 0 }}
                </span>
              </div>
              <div class="chart-body">
                <svg class="svg-layer" viewBox="0 0 2400 300" preserveAspectRatio="none" shape-rendering="geometricPrecision">
                  <path :d="areaPath" fill="url(#blueGrad)" />
                  <path :d="linePath" class="path-line" />
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#1677ff" stop-opacity="0.15" />
                      <stop offset="100%" stop-color="#1677ff" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <div v-for="(h, i) in hourlyData" :key="i" class="data-node" :style="{ left: `${(i/23)*100}%` }">
                  <div v-if="h.count > 0" class="value-tag" :style="{ bottom: `${(h.count/maxVal)*100}%` }">
                    <span class="count-text">{{ h.count }}</span>
                    <div class="dot-marker"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="x-axis">
              <div v-for="h in 24" :key="h-1" class="x-tick">{{ h-1 }}h</div>
            </div>
          </div>
        </a-card>

        <!-- 多选模式下的对比分析工具栏 -->
        <div v-else>
          <a-card :bordered="false" class="trend-card multi-header-card" style="margin-bottom: 24px;">
            <div class="card-head" style="padding-bottom: 0;">
              <div class="title-group">
                <h3 class="trend-title">多主页数据对比分析</h3>
              </div>
              <div class="picker-group">
                <span class="picker-label">日期 (A):</span>
                <a-date-picker v-model:value="multiDateA" :allow-clear="false" size="small" style="width: 125px" />
                <span class="picker-sep">VS</span>
                <span class="picker-label">日期 (B):</span>
                <a-date-picker v-model:value="multiDateB" :allow-clear="false" size="small" style="width: 125px" />
              </div>
            </div>
          </a-card>

          <a-row :gutter="24">
          <a-col :span="8" v-for="pageId in activePageIds" :key="pageId">
            <a-card :bordered="false" class="page-summary-card">
              <div class="card-head">
                <div class="title-group">
                  <a-avatar :src="pageList.find(p => p.id === pageId)?.avatar" :size="24" style="margin-right: 8px" />
                  <h3 class="trend-title">{{ pageList.find(p => p.id === pageId)?.name || '未知主页' }}</h3>
                </div>
                <span class="sub-hint">{{ multiDateA.format('MM-DD') }} 对比 {{ multiDateB.format('MM-DD') }}</span>
              </div>

              <div v-if="dailyDataByPage[pageId]">
                <div class="mini-stats-row">
                  <div class="stat-item-mini">
                    <div class="stat-label">{{ multiDateA.format('MM-DD') }}</div>
                    <div class="stat-num-mini">{{ dailyDataByPage[pageId].current.totalCount }}</div>
                  </div>
                  <div class="stat-item-mini compare">
                    <div class="stat-label">{{ multiDateB.format('MM-DD') }}</div>
                    <div class="stat-num-mini">{{ dailyDataByPage[pageId].compare?.totalCount || 0 }}</div>
                  </div>
                </div>

                <div class="gender-analysis-box-mini">
                  <span class="stat-label">性别比例: </span>
                  <div class="gender-legend-mini">
                    <span class="legend-item"><i class="dot female"></i>女 {{ dailyDataByPage[pageId].current.genderPerc.female }}%</span>
                    <span class="legend-item"><i class="dot male"></i>男 {{ dailyDataByPage[pageId].current.genderPerc.male }}%</span>
                  </div>
                </div>

                <!-- Mini Hourly Chart -->
                <div class="chart-container-mini" style="margin-top: 30px">
                  <div class="chart-main-mini">
                    <div class="y-axis-mini">
                      <span v-for="i in 6" :key="i">
                        {{ dailyDataByPage[pageId].combinedMax > 0 ? Math.round(dailyDataByPage[pageId].combinedMax * (6 - i) / 5) : 0 }}
                      </span>
                    </div>
                    <div class="chart-body-mini">
                      <svg class="svg-layer" viewBox="0 0 2400 100" preserveAspectRatio="none" shape-rendering="geometricPrecision">
                        <!-- 昨天的线 (对比组) -->
                        <path :d="getLinePath(dailyDataByPage[pageId].compare.hourlyData, dailyDataByPage[pageId].combinedMax, 100)" class="path-line compare-line" />
                        <!-- 今天的线 -->
                        <path :d="getAreaPath(dailyDataByPage[pageId].current.hourlyData, dailyDataByPage[pageId].combinedMax, 100)" fill="url(#blueGrad)" />
                        <path :d="getLinePath(dailyDataByPage[pageId].current.hourlyData, dailyDataByPage[pageId].combinedMax, 100)" class="path-line" />
                        <defs>
                          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#1677ff" stop-opacity="0.15" />
                            <stop offset="100%" stop-color="#1677ff" stop-opacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                  <div class="x-axis-mini">
                    <div v-for="h in [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]" :key="h" class="x-tick">{{ h }}h</div>
                  </div>
                </div>
              </div>
              <a-empty v-else description="暂无数据" :image-style="{ height: '60px' }" />
            </a-card>
          </a-col>
          <!-- If less than 3 items, fill with empty columns for consistent layout -->
          <template v-if="activePageIds.length > 0 && activePageIds.length % 3 !== 0">
            <a-col :span="8" v-for="i in (3 - (activePageIds.length % 3))" :key="`empty-${i}`">
              <a-card :bordered="false" class="page-summary-card empty-card">
                <a-empty description="选择更多主页" :image-style="{ height: '60px' }" />
              </a-card>
            </a-col>
          </template>
          <template v-else-if="activePageIds.length === 0">
            <a-col :span="24">
              <a-empty description="请从上方下拉菜单选择至少一个主页以查看数据" style="margin-top: 60px" />
            </a-col>
          </template>
        </a-row>
        </div>

        <!-- 长期历史引流趋势分析 -->
        <a-card :bordered="false" class="trend-card history-card" style="margin-top: 24px" v-if="!isMultiMode">
          <div class="card-head">
            <div class="title-group">
              <h3 class="trend-title">历史引流趋势</h3>
              <!-- <span class="sub-hint">多日聚合数据分析</span> -->
            </div>
            <a-range-picker v-model:value="rangeDate" size="small" :allow-clear="false" style="width: 280px" />
          </div>

          <div class="range-gender-summary">
            <div class="range-gender-label-row">
              <span class="stat-label">所选时段性别汇总 (总计: {{ rangeTotalCount }})</span>
              <div class="gender-legend">
                <span class="legend-item"><i class="dot female"></i>女性 {{ rangeGenderPerc.female }}%</span>
                <span class="legend-item"><i class="dot male"></i>男性 {{ rangeGenderPerc.male }}%</span>
              </div>
            </div>
            <div class="gender-progress-bar">
              <div class="segment female" :style="{ width: rangeGenderPerc.female + '%' }"></div>
              <div class="segment male" :style="{ width: rangeGenderPerc.male + '%' }"></div>
            </div>
          </div>

          <div class="chart-container" style="margin-top: 32px">
            <div class="chart-main">
              <div class="y-axis">
                <span v-for="i in 6" :key="i">
                  {{ rangeMaxVal > 0 ? Math.round(rangeMaxVal * (6 - i) / 5) : 0 }}
                </span>
              </div>
              <div class="chart-body">
                <svg class="svg-layer" viewBox="0 0 2400 300" preserveAspectRatio="none" shape-rendering="geometricPrecision">
                  <path :d="rangeAreaPath" fill="url(#greenGrad)" />
                  <path :d="rangeLinePath" class="path-line green-line" />
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#52c41a" stop-opacity="0.15" />
                      <stop offset="100%" stop-color="#52c41a" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <div v-for="(d, i) in dailyRangeData" :key="i" class="data-node" :style="{ left: `${(i / (dailyRangeData.length - 1 || 1)) * 100}%` }">
                  <div v-if="d.count > 0" class="value-tag" :style="{ bottom: `${(d.count / rangeMaxVal) * 100}%` }">
                    <span class="count-text range-count">{{ d.count }}</span>
                    <div class="dot-marker green-dot"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="x-axis">
              <div v-for="(d, i) in dailyRangeData" :key="i" class="x-tick">{{ d.date.split('-').slice(1).join('/') }}</div>
            </div>
          </div>
        </a-card>
      </main>
    </div>
  </a-config-provider>
</template>

<script setup>
import { ref, computed, onMounted, watch, h } from 'vue';
import { ThunderboltFilled, RocketFilled, BarChartOutlined, DownOutlined, UserOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons-vue';
import { message, theme } from 'ant-design-vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';

// 插件初始化
dayjs.extend(utc);
dayjs.extend(timezonePlugin);

// --- 响应式状态管理 ---
const step = ref('loading');
const loadingTip = ref('载入中...');
const token = ref('');
const inputToken = ref('');
const pageList = ref([]); // All available pages
const selectedId = ref(localStorage.getItem('LAST_PAGE_ID')); // For single mode
const selectedIds = ref(JSON.parse(localStorage.getItem('MULTI_PAGE_IDS') || '[]'));
const isMultiMode = ref(localStorage.getItem('IS_MULTI_MODE') === 'true');
const isDarkMode = ref(localStorage.getItem('THEME_MODE') === 'dark');
const timezone = ref(localStorage.getItem('PREF_TZ') || 'local');
const quickDate = ref('today');

// --- 数据存储 (per page) ---
const dailyDataByPage = ref({}); // { pageId: { totalCount, hourlyData, genderStats, genderPerc, maxVal } }
const rangeDataByPage = ref({}); // { pageId: { dailyRangeData, rangeGenderStats, rangeGenderPerc, rangeMaxVal } }
// --- 日期与时区计算 ---
const getNowInTz = () => timezone.value === 'local' ? dayjs() : dayjs().tz(timezone.value);
const targetDate = ref(getNowInTz());
// 多选模式对比日期
const multiDateA = ref(getNowInTz());
const multiDateB = ref(getNowInTz().subtract(1, 'day'));
const rangeDate = ref([dayjs().subtract(6, 'day'), dayjs()]);

// --- 数据存储 ---
const allTimezones = Intl.supportedValuesOf('timeZone');
const currentPage = computed(() => pageList.value.find(p => p.id == selectedId.value));

// 当前生效的 ID 列表
const activePageIds = computed(() => {
  return isMultiMode.value ? selectedIds.value : (selectedId.value ? [selectedId.value] : []);
});

// --- 工具函数 ---
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// --- API 请求核心逻辑 ---
const fetchAllPages = async (pageId, userToken, filters) => {
  const fdBase = new FormData();
  filters.forEach((f, idx) => {
    Object.keys(f).forEach(key => fdBase.append(`filter[${idx}][${key}]`, f[key]));
  });

  const getUrl = (p) => `https://botcake.io/api/v1/pages/${pageId}/customers?page_size=100&page=${p}&access_token=${userToken}`;
  
  const firstRes = await fetch(getUrl(1), { method: 'POST', body: fdBase });
  if (firstRes.status === 500) throw new Error("Botcake后端压力过大，请稍后刷新。");
  if (!firstRes.ok) throw new Error(`请求失败: ${firstRes.status}`);

  const firstJson = await firstRes.json();
  let allCustomers = firstJson.customers || [];
  const totalEntries = firstJson.total_entries || 0;

  // 递归/分页获取后续数据
  if (totalEntries > 100) {
    const totalPages = Math.ceil(totalEntries / 100);
    const batchSize = 5; // 控制并发量
    for (let i = 2; i <= totalPages; i += batchSize) {
      const currentBatch = [];
      for (let j = i; j < i + batchSize && j <= totalPages; j++) {
        currentBatch.push(
          fetch(getUrl(j), { method: 'POST', body: fdBase })
            .then(r => r.ok ? r.json() : { customers: [] })
        );
      }
      const results = await Promise.all(currentBatch);
      results.forEach(res => {
        if (res.customers) allCustomers = allCustomers.concat(res.customers);
      });
      loadingTip.value = `同步中: ${Math.round((allCustomers.length / totalEntries) * 100)}%`;
    }
  }
  return allCustomers;
};

const fetchDailyDataForSinglePage = async (pageId, userToken, targetDateValue) => {
  if (!pageId || !userToken || !targetDateValue) return null;
  const dayString = targetDateValue.format('YYYY-MM-DD');
  
  // 时间边界处理
  const requestStart = targetDateValue.startOf('day').subtract(2, 'hour').unix();
  const requestEnd = targetDateValue.endOf('day').add(2, 'hour').unix();

  const bins = Array.from({ length: 24 }, (_, i) => ({ h: i, count: 0 }));
  const gCount = { male: 0, female: 0, unknown: 0 };
  
  try {
    const filters = [{ 
      type: 'last_subscribed', 
      filter_type: 'ranger', 
      unit: 'hour',
      start_date: requestStart.toString(),
      end_date: requestEnd.toString() 
    }];

    const allCustomers = await fetchAllPages(pageId, userToken, filters);

    let validTotal = 0;
    const currentTz = timezone.value === 'local' ? dayjs.tz.guess() : timezone.value;

    allCustomers.forEach(c => {
      let d = dayjs.unix(c.last_subscribed_at);
      d = d.tz(currentTz);
      if (d.format('YYYY-MM-DD') === dayString) {
        validTotal++;
        bins[d.hour()].count++;
        if (c.gender === 'male' || c.gender === 1) gCount.male++;
        else if (c.gender === 'female' || c.gender === 2) gCount.female++;
        else gCount.unknown++;
      }
    });

    const totalG = gCount.male + gCount.female;
    const gPerc = totalG === 0 ? { male: 0, female: 0 } : { 
      male: ((gCount.male / totalG) * 100).toFixed(1), 
      female: ((gCount.female / totalG) * 100).toFixed(1) 
    };
    const mVal = Math.max(...bins.map(v => v.count), 5) * 1.4;

    return {
      pageId,
      totalCount: validTotal,
      hourlyData: bins,
      genderStats: gCount,
      genderPerc: gPerc,
      maxVal: mVal
    };
  } catch (err) { 
    message.error(err.message); 
    return null;
  }
};

const fetchRangeDataForSinglePage = async (pageId, userToken, rangeDateValue) => {
  if (!pageId || !userToken || !rangeDateValue) return null;
  const [start, end] = rangeDateValue;
  const requestStart = start.startOf('day').subtract(2, 'hour').unix();
  const requestEnd = end.endOf('day').add(2, 'hour').unix();
  const diffDays = end.diff(start, 'day');
  
  const bins = Array.from({ length: diffDays + 1 }, (_, i) => ({ 
    date: start.add(i, 'day').format('YYYY-MM-DD'), count: 0 
  }));
  const rgCount = { male: 0, female: 0, unknown: 0 };

  try {
    const filters = [{ 
      type: 'last_subscribed', 
      filter_type: 'ranger', 
      unit: 'day',
      start_date: requestStart.toString(),
      end_date: requestEnd.toString()
    }];

    const allCustomers = await fetchAllPages(pageId, userToken, filters);

    allCustomers.forEach(c => {
      let d = dayjs.unix(c.last_subscribed_at);
      d = d.tz(timezone.value === 'local' ? dayjs.tz.guess() : timezone.value);
      const dStr = d.format('YYYY-MM-DD');
      const target = bins.find(b => b.date === dStr);
      if (target) {
        target.count++;
        if (c.gender === 'male' || c.gender === 1) rgCount.male++;
        else if (c.gender === 'female' || c.gender === 2) rgCount.female++;
        else rgCount.unknown++;
      }
    });

    return {
      pageId,
      dailyRangeData: bins,
      rangeGenderStats: rgCount
    };
  } catch (err) { 
    console.error(err);
    return null;
  }
};

// --- 计算属性 ---
const genderPerc = computed(() => {
  const stats = genderStats.value;
  const total = stats.male + stats.female;
  if (total === 0) return { male: 0, female: 0 };
  return { male: ((stats.male / total) * 100).toFixed(1), female: ((stats.female / total) * 100).toFixed(1) };
});

// Main fetchData function, orchestrates fetching for single or multiple pages
const fetchData = async () => {
  if (activePageIds.value.length === 0 || !token.value || !targetDate.value) {
    dailyDataByPage.value = {}; // Clear data if no pages selected
    return;
  }

  loadingTip.value = '正在获取当日数据...';
  const newDailyDataByPage = {};
  try {
    // 根据模式确定要对比的两个日期
    const dateCurrent = isMultiMode.value ? multiDateA.value : targetDate.value;
    const dateCompare = isMultiMode.value ? multiDateB.value : targetDate.value.subtract(1, 'day');

    if (!dateCurrent || !dateCompare) return;
    
    const promises = activePageIds.value.map(id => fetchDailyDataForSinglePage(id, token.value, dateCurrent));
    const prevPromises = activePageIds.value.map(id => fetchDailyDataForSinglePage(id, token.value, dateCompare));
    
    const results = await Promise.all(promises);
    const prevResults = await Promise.all(prevPromises);

    activePageIds.value.forEach((id, idx) => {
      const current = results[idx];
      const compare = prevResults[idx];
      if (current) {
        newDailyDataByPage[id] = {
          current,
          // 如果对比日期数据获取失败，提供默认空值以防报错
          compare: compare || { 
            totalCount: 0, 
            hourlyData: Array.from({ length: 24 }, (_, i) => ({ h: i, count: 0 })), 
            genderStats: { male: 0, female: 0, unknown: 0 },
            genderPerc: { male: 0, female: 0 },
            maxVal: 0 
          },
          // 综合两天的最大值，确保图表比例一致
          combinedMax: Math.max(current.maxVal || 0, compare?.maxVal || 0)
        };
      }
    });
    
    dailyDataByPage.value = newDailyDataByPage;
  } catch (err) {
    console.error("Error in fetchData (main):", err);
  } finally {
    loadingTip.value = '载入中...'; // Reset loading tip
  }
};

// Main fetchRangeData function, orchestrates fetching for single or multiple pages
const fetchRangeData = async () => {
  // 如果是多选模式，或者没有选中 ID，直接跳过历史数据请求
  if (isMultiMode.value || activePageIds.value.length === 0 || !token.value || !rangeDate.value) {
    rangeDataByPage.value = {}; // Clear data if no pages selected
    return;
  }

  loadingTip.value = '正在获取历史数据...';
  const newRangeDataByPage = {};
  try {
    const promises = activePageIds.value.map(id => fetchRangeDataForSinglePage(id, token.value, rangeDate.value));
    const results = await Promise.all(promises);
    results.filter(Boolean).forEach(data => { // Filter out null results
      newRangeDataByPage[data.pageId] = data;
    });
    rangeDataByPage.value = newRangeDataByPage;
  } catch (err) {
    console.error("Error in fetchRangeData (main):", err);
  } finally {
    loadingTip.value = '载入中...'; // Reset loading tip
  }
};

// --- Computed properties for the main (single or aggregated) display ---
const totalCount = computed(() => {
  if (isMultiMode.value) {
    return Object.values(dailyDataByPage.value).reduce((sum, page) => sum + page.current.totalCount, 0);
  }
  return dailyDataByPage.value[selectedId.value]?.current?.totalCount || 0;
});

const hourlyData = computed(() => {
  if (isMultiMode.value) {
    const aggregatedBins = Array.from({ length: 24 }, (_, i) => ({ h: i, count: 0 }));
    Object.values(dailyDataByPage.value).forEach(page => {
      page.current.hourlyData.forEach((bin, i) => {
        aggregatedBins[i].count += bin.count;
      });
    });
    return aggregatedBins;
  }
  return dailyDataByPage.value[selectedId.value]?.current?.hourlyData || Array.from({ length: 24 }, (_, i) => ({ h: i, count: 0 }));
});

const genderStats = computed(() => {
  if (isMultiMode.value) {
    const aggregatedGCount = { male: 0, female: 0, unknown: 0 };
    Object.values(dailyDataByPage.value).forEach(page => {
      aggregatedGCount.male += page.current.genderStats.male;
      aggregatedGCount.female += page.current.genderStats.female;
      aggregatedGCount.unknown += page.current.genderStats.unknown;
    });
    return aggregatedGCount;
  }
  return dailyDataByPage.value[selectedId.value]?.current?.genderStats || { male: 0, female: 0, unknown: 0 };
});

const maxVal = computed(() => Math.max(...hourlyData.value.map(v => v.count), 5) * 1.4); // This now uses the computed hourlyData

// Range data computed properties (aggregated in multi-mode)
const dailyRangeData = computed(() => {
  if (isMultiMode.value) {
    const activeIds = activePageIds.value;
    if (activeIds.length === 0) return [];

    // Find the longest dailyRangeData to use as a base for aggregation
    let longestData = [];
    let longestLength = 0;
    for (const pageId of activeIds) {
      const pageData = rangeDataByPage.value[pageId]?.dailyRangeData;
      if (pageData && pageData.length > longestLength) {
        longestData = JSON.parse(JSON.stringify(pageData)); // Deep copy
        longestLength = pageData.length;
      }
    }

    if (longestLength === 0) return [];

    // Aggregate counts
    for (const pageId of activeIds) {
      const pageData = rangeDataByPage.value[pageId]?.dailyRangeData;
      if (pageData) {
        pageData.forEach((bin, i) => {
          if (longestData[i] && longestData[i].date === bin.date) { // Ensure dates align
            longestData[i].count += bin.count;
          }
        });
      }
    }
    return longestData;
  }
  return rangeDataByPage.value[selectedId.value]?.dailyRangeData || [];
});

const rangeGenderStats = computed(() => {
  if (isMultiMode.value) {
    const aggregatedRgCount = { male: 0, female: 0, unknown: 0 };
    Object.values(rangeDataByPage.value).forEach(page => {
      aggregatedRgCount.male += page.rangeGenderStats.male;
      aggregatedRgCount.female += page.rangeGenderStats.female;
      aggregatedRgCount.unknown += page.rangeGenderStats.unknown;
    });
    return aggregatedRgCount;
  }
  return rangeDataByPage.value[selectedId.value]?.rangeGenderStats || { male: 0, female: 0, unknown: 0 };
});

const rangeTotalCount = computed(() => rangeGenderStats.value.male + rangeGenderStats.value.female);
const rangeGenderPerc = computed(() => { // This now uses the computed rangeGenderStats
  const stats = rangeGenderStats.value;
  const total = stats.male + stats.female;
  if (total === 0) return { male: 0, female: 0 };
  return { male: ((stats.male / total) * 100).toFixed(1), female: ((stats.female / total) * 100).toFixed(1) };
});

const rangeMaxVal = computed(() => Math.max(...dailyRangeData.value.map(v => v.count), 5) * 1.4); // This now uses the computed dailyRangeData

// 图表路径生成逻辑 (now as functions to be called with specific data and height)
const getLinePath = (data, maxValue, chartHeight = 300) => {
  if (!data || data.length === 0) return '';
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * 2400; // Scale to 2400 width
    const y = chartHeight - (v.count / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' L ');
  return `M ${points}`;
};

const getAreaPath = (data, maxValue, chartHeight = 300) => {
  if (!data || data.length === 0) return '';
  const line = getLinePath(data, maxValue, chartHeight);
  return `${line} L 2400,${chartHeight} L 0,${chartHeight} Z`;
};

const linePath = computed(() => getLinePath(hourlyData.value, maxVal.value));
const areaPath = computed(() => getAreaPath(hourlyData.value, maxVal.value));

const rangeLinePath = computed(() => getLinePath(dailyRangeData.value, rangeMaxVal.value));
const rangeAreaPath = computed(() => getAreaPath(dailyRangeData.value, rangeMaxVal.value));

// --- 事件监听与监控 ---
const handleQuickDate = (e) => {
  const now = timezone.value === 'local' ? dayjs() : dayjs().tz(timezone.value);
  targetDate.value = e.target.value === 'today' ? now : now.subtract(1, 'day');
};

watch(timezone, (newTz) => {
  localStorage.setItem('PREF_TZ', newTz);
  targetDate.value = getNowInTz();
  multiDateA.value = getNowInTz();
  multiDateB.value = getNowInTz().subtract(1, 'day');
  fetchData(); 
  fetchRangeData();
});

watch([activePageIds, targetDate, multiDateA, multiDateB], fetchData, { deep: true });
watch([activePageIds, rangeDate], fetchRangeData);

// --- 初始化流程 ---
const init = async () => {
  step.value = 'loading';
  const activeToken = getCookie('token_jwt') || localStorage.getItem('BOTCAKE_TOKEN');
  if (!activeToken) { step.value = 'login'; return; }
  token.value = activeToken;
  try {
    const res = await fetch(`https://botcake.io/api/v1/pages?access_token=${activeToken}`);
    const data = await res.json();
    const list = data.categorized?.activated || data.pages || [];
    if (list.length > 0) {
      pageList.value = list.map(p => ({ ...p, avatar: `https://pages.fm/api/v1/pages/${p.id}/botcake/avatar` }));
      if (!selectedId.value) selectedId.value = list[0].id;
      step.value = 'dashboard';
      fetchData(); 
      fetchRangeData();
    } else { 
      step.value = 'login'; 
    }
  } catch (e) { 
    handleLogout(); 
  }
};

const handleAutoSync = () => { 
  if (getCookie('token_jwt') || localStorage.getItem('BOTCAKE_TOKEN')) {
    localStorage.setItem('BOTCAKE_TOKEN', getCookie('token_jwt'));
    init()
  } else message.error("未找到有效的浏览器 Cookie 凭证"); 
};

const saveManualToken = () => { 
  if(inputToken.value) { 
    localStorage.setItem('BOTCAKE_TOKEN', inputToken.value); 
    init(); 
  } 
};

const handleLogout = () => { 
  localStorage.clear(); 
  step.value = 'login'; 
};

const handlePageSwitch = ({ key }) => { 
  selectedId.value = key; 
  localStorage.setItem('LAST_PAGE_ID', key); 
};

const togglePageSelection = (id) => {
  const index = selectedIds.value.indexOf(id);
  if (index > -1) {
    selectedIds.value.splice(index, 1);
  } else {
    selectedIds.value.push(id);
  }
  localStorage.setItem('MULTI_PAGE_IDS', JSON.stringify(selectedIds.value));
};

const handleModeChange = (checked) => {
  isMultiMode.value = checked;
  localStorage.setItem('IS_MULTI_MODE', checked);
  // 切换模式后自动触发数据更新通过 watch(activePageIds)
  // Also, if switching from multi to single, ensure selectedId is valid
  if (!checked && activePageIds.value.length > 0 && !selectedId.value) {
    selectedId.value = activePageIds.value[0]; // Default to first selected page
  }
};

const onTzChange = (v) => { timezone.value = v; };

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem('THEME_MODE', isDarkMode.value ? 'dark' : 'light');
};

onMounted(init);
</script>

<style scoped>
/* 核心布局 */
.dashboard-wrapper { background: #f8fafc; min-height: 100vh; }
.dashboard-wrapper.dark-theme { background: #0f172a; }
.glass-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  height: 80px;
  display: flex;
  align-items: center;
}
.dark-theme .glass-nav { background: rgba(30, 41, 59, 0.8); border-bottom-color: rgba(255, 255, 255, 0.05); }

.nav-container {
  width: 100%;
  max-width: 1248px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-left { display: flex; align-items: center; gap: 24px; }
.brand-box { display: flex; align-items: center; gap: 10px; color: #1e293b; }
.dark-theme .brand-box { color: #f1f5f9; }
.brand-title { font-size: 18px; font-weight: 800; }

.page-pill {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 6px 14px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.dark-theme .page-pill { background: #1e293b; border-color: #334155; }
.page-pill:hover { background: #e2e8f0; }
.dark-theme .page-pill:hover { background: #334155; }
.page-name { font-weight: 600; font-size: 14px; color: #334155; }
.dark-theme .page-name { color: #f1f5f9; }

.nav-right { display: flex; align-items: center; gap: 24px; }
.mode-toggle { display: flex; align-items: center; }
.tz-group { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 4px 12px; display: flex; align-items: center; gap: 8px; transition: border-color 0.2s; }
.dark-theme .tz-group { background: #1e293b; border-color: #334155; }
.tz-group:hover { border-color: #cbd5e1; }
.dark-theme .tz-group:hover { border-color: #475569; }
.tz-label { font-size: 12px; color: #64748b; font-weight: 600; }
.tz-select { width: 160px; }

.theme-toggle-btn { font-size: 18px; display: flex; align-items: center; justify-content: center; }

/* 统计卡片与内容 */
.main-content { padding: 112px 24px 40px; max-width: 1248px; margin: 0 auto; }
.chart-main { display: flex; gap: 12px; }
.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  min-width: 40px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
  padding-bottom: 0;
  padding-top: 2px;
  line-height: 1;
}
.trend-card { 
  border-radius: 24px; 
  background: #fff; 
  box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  transition: box-shadow 0.3s ease;
}
.dark-theme .trend-card { background: #1e293b; border: 1px solid #334155; }
.trend-card:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
.main-stats-card { padding: 8px; }

/* 核心图表样式 */
.chart-container { position: relative; width: 100%; }
.chart-body { 
  height: 280px; 
  position: relative; 
  display: block; 
}

.data-node { 
  position: absolute; 
  height: 100%; 
  top: 0;
  pointer-events: none;
}

.value-tag {
  position: absolute;
  transform: translate(-50%, -12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
}

.count-text {
  font-size: 11px;
  font-weight: 800;
  color: #1677ff;
  background: #fff;
  padding: 2px 5px;
  border-radius: 4px;
  border: 1px solid #d6e4ff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  white-space: nowrap;
}
.dark-theme .count-text { background: #0f172a; border-color: #1e293b; }
.range-count { color: #52c41a; border-color: #d9f7be; }

.dot-marker { width: 6px; height: 6px; background: #1677ff; border: 1.5px solid #fff; border-radius: 50%; }
.green-dot { background: #52c41a; }

/* 性别分析样式 */
.range-gender-summary { margin-top: 16px; }
.dark-theme .range-gender-label-row .stat-label { color: #94a3b8; }
.gender-progress-bar { height: 10px; background: #f1f5f9; border-radius: 50px; display: flex; overflow: hidden; margin-top: 10px; }
.segment { transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
.segment.female { background: #ffadd2; }
.segment.male { background: #adc6ff; }

/* 登录页样式 */
.full-screen-center { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f8fafc; }
.full-screen-center.dark-theme { background: #020617; }
.login-card { width: 380px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
.dark-theme .login-card { background: #1e293b; }
.login-header { text-align: center; margin-bottom: 24px; }
.login-divider { display: flex; align-items: center; margin: 24px 0; gap: 12px; }
.divider-line { flex: 1; height: 1px; background: #f1f5f9; }
.dark-theme .divider-line { background: #334155; }
.divider-text { font-size: 12px; color: #94a3b8; white-space: nowrap; font-weight: 500; }
.manual-section { display: flex; flex-direction: column; gap: 12px; }
.manual-input { border-radius: 12px !important; }
.manual-btn { 
  border-radius: 12px !important; 
  border: 1px solid #e2e8f0; 
  font-weight: 600; 
  color: #64748b; 
  transition: all 0.3s;
}
.dark-theme .manual-btn { border-color: #334155; color: #94a3b8; }
.manual-btn:hover { color: #1677ff; border-color: #1677ff; background: #f0f7ff; }

.stat-num { font-size: 56px; font-weight: 900; color: #0f172a; line-height: 1; }
.dark-theme .stat-num { color: #f1f5f9; }
.gender-analysis-box { background: #f8fafc; padding: 24px; border-radius: 20px; border: 1px solid #f1f5f9; }
.dark-theme .gender-analysis-box { background: #0f172a; border-color: #1e293b; }
.pie-container { display: flex; align-items: center; gap: 20px; }
.circular-chart { width: 72px; height: 72px; }
.circle-bg { fill: none; stroke: #eee; stroke-width: 3.8; }
.dark-theme .circle-bg { stroke: #1e293b; }
.circle.female-path { fill: none; stroke: #ffadd2; stroke-width: 3.8; stroke-linecap: round; }

/* SVG 与 坐标轴 */
.svg-layer { width: 100%; height: 100%; }
.path-line { fill: none; stroke: 
#1677ff; stroke-width: 2.5; stroke-linecap: round; }
.green-line { stroke: #52c41a; }
.x-axis { 
  display: flex; 
  justify-content: space-between; 
  margin-top: 12px; 
  color: #94a3b8; 
  font-size: 10px; 
  padding-left: 52px; 
}

/* 下拉菜单优化 */
.page-menu-list {
  max-height: 400px;
  overflow-y: auto;
}

/* Multi-mode specific styles for smaller cards */
.page-summary-card {
  margin-bottom: 24px; 
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #f1f5f9;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
}
.dark-theme .page-summary-card { background: #1e293b; border-color: #334155; }
.page-summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
}
.page-summary-card .card-head {
  padding-bottom: 12px;
}
.mini-stats-row { 
  display: flex; 
  justify-content: space-around; 
  margin: 8px 0 20px; 
  text-align: center;
  background: #f8fafc;
  padding: 12px;
  border-radius: 14px;
}
.dark-theme .mini-stats-row { background: #0f172a; }
.stat-item-mini.compare .stat-num-mini { color: #94a3b8; }
.stat-item-mini.compare .stat-label { color: #94a3b8; }
.stat-num-mini { font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1.2; }
.dark-theme .stat-num-mini { color: #f1f5f9; }
.path-line.compare-line { stroke: #cbd5e1; stroke-dasharray: 4, 4; stroke-width: 1.5; }

.gender-analysis-box-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}
.gender-legend-mini { display: flex; gap: 10px; }
.chart-container-mini { height: 110px; position: relative; width: 100%; }
.chart-main-mini { display: flex; gap: 4px; height: 100px; }
.multi-header-card .trend-title { font-size: 16px; }
.multi-header-card .picker-sep {
  margin: 0 10px;
  color: #94a3b8;
  font-weight: 700;
  font-size: 12px;
}
.multi-header-card .picker-label {
  margin-right: 6px;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}
.y-axis-mini {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  min-width: 24px;
  color: #94a3b8;
  font-size: 9px;
  font-weight: 500;
  padding: 2px 0;
  line-height: 1;
}
.chart-body-mini { flex: 1; height: 100px; position: relative; display: block; }
.x-axis-mini {
  display: flex; justify-content: space-between; margin-top: 4px; color: #94a3b8; font-size: 9px;
  padding-left: 28px; /* Offset for y-axis width */
}
</style>