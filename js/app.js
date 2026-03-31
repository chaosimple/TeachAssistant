/**
 * 主应用入口
 * 初始化所有模块并设置全局事件
 */
const App = {
    // 未保存变更标记
    hasUnsavedChanges: false,

    /**
     * 初始化应用
     */
    init() {
        // 检查数据状态
        const dataStatus = this.checkDataStatus();

        // 先初始化设置模块（其他模块依赖它）
        SettingsModule.init();

        // 初始化各模块
        StudentModule.init();
        AttendanceModule.init();
        GradeModule.init();
        StatisticsModule.init();

        // 初始化标签页切换
        this.initTabs();

        // 初始化弹窗关闭
        this.initModals();

        // 初始化导入导出功能
        this.initDataImport();
        this.initDataExport();

        // 初始化保存状态指示器
        this.initSaveIndicator();

        // 初始化页面关闭提醒
        this.initBeforeUnload();

        // 如果没有数据，显示欢迎弹窗
        if (!dataStatus.hasData) {
            this.showWelcomeModal();
        }

        console.log('课堂互动系统已初始化');
    },

    /**
     * 检查 localStorage 数据状态
     * @returns {Object} 数据状态
     */
    checkDataStatus() {
        const students = localStorage.getItem('classroom_students');
        const settings = localStorage.getItem('classroom_settings');
        const history = localStorage.getItem('classroom_interaction');
        const grades = localStorage.getItem('classroom_grades');

        const hasStudents = students && JSON.parse(students).length > 0;
        const hasSettings = settings && JSON.parse(settings).semesterStart;
        const hasHistory = history && JSON.parse(history).length > 0;
        const hasGrades = grades && Object.keys(JSON.parse(grades)).length > 0;

        return {
            hasStudents,
            hasSettings,
            hasHistory,
            hasGrades,
            hasData: hasStudents || hasSettings || hasHistory || hasGrades
        };
    },

    /**
     * 显示欢迎弹窗
     */
    showWelcomeModal() {
        document.getElementById('welcomeModal').classList.add('active');
    },

    /**
     * 隐藏欢迎弹窗
     */
    hideWelcomeModal() {
        document.getElementById('welcomeModal').classList.remove('active');
    },

    /**
     * 标记数据已变更
     */
    markDataChanged() {
        this.hasUnsavedChanges = true;
        this.updateSaveIndicator();
    },

    /**
     * 标记数据已保存
     */
    markDataSaved() {
        this.hasUnsavedChanges = false;
        this.updateSaveIndicator();
    },

    /**
     * 更新保存状态指示器
     */
    updateSaveIndicator() {
        const indicator = document.getElementById('saveIndicator');
        const icon = indicator.querySelector('.save-icon');
        const text = indicator.querySelector('.save-text');

        if (this.hasUnsavedChanges) {
            indicator.classList.remove('saved');
            indicator.classList.add('unsaved');
            icon.textContent = '●';
            text.textContent = '未保存';
        } else {
            indicator.classList.remove('unsaved');
            indicator.classList.add('saved');
            icon.textContent = '✓';
            text.textContent = '已保存';
        }
    },

    /**
     * 初始化保存状态指示器
     */
    initSaveIndicator() {
        const indicator = document.getElementById('saveIndicator');
        indicator.addEventListener('click', () => {
            this.exportFullBackup();
        });
        // 初始状态为已保存
        this.markDataSaved();
    },

    /**
     * 初始化页面关闭提醒
     */
    initBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '您有未保存的变更，确定要离开吗？';
                return e.returnValue;
            }
        });
    },

    /**
     * 初始化标签页切换
     */
    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;

                // 切换按钮状态
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 切换内容显示
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === tabId) {
                        content.classList.add('active');
                    }
                });

                // 切换到成绩页面时刷新
                if (tabId === 'grades') {
                    GradeModule.renderGradeList();
                }

                // 切换到历史页面时刷新
                if (tabId === 'history') {
                    AttendanceModule.renderHistory();
                }

                // 切换到设置页面时刷新
                if (tabId === 'settings') {
                    SettingsModule.updateSettingsDisplay();
                }

                // 切换到统计页面时刷新
                if (tabId === 'statistics') {
                    StatisticsModule.refresh();
                }
            });
        });
    },

    /**
     * 初始化弹窗控制
     */
    initModals() {
        // 点击关闭按钮关闭弹窗
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeBtn.closest('.modal').classList.remove('active');
            });
        });

        // 点击背景关闭弹窗
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // ESC键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });

        // Enter键提交
        document.getElementById('studentId').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('studentName').focus();
            }
        });

        document.getElementById('studentName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btnConfirmAdd').click();
            }
        });

        // 欢迎弹窗 - 导入数据按钮
        document.getElementById('btnWelcomeImport').addEventListener('click', () => {
            document.getElementById('fileImportWelcome').click();
        });

        // 欢迎弹窗 - 前往设置按钮
        document.getElementById('btnWelcomeSettings').addEventListener('click', () => {
            this.hideWelcomeModal();
            // 切换到设置标签页
            document.querySelector('.tab-btn[data-tab="settings"]').click();
        });

        // 欢迎弹窗文件选择
        document.getElementById('fileImportWelcome').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                await this.importFullBackup(file);
                this.hideWelcomeModal();
                showToast('数据导入成功', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }

            e.target.value = '';
        });
    },

    /**
     * 初始化数据导入功能
     */
    initDataImport() {
        const btnImport = document.getElementById('btnImportData');
        const fileInput = document.getElementById('fileImportData');

        btnImport.addEventListener('click', () => {
            if (this.hasUnsavedChanges) {
                if (!confirm('当前有未保存的变更，导入新数据将覆盖当前数据，是否继续？')) {
                    return;
                }
            } else if (this.checkDataStatus().hasData) {
                if (!confirm('导入将覆盖当前所有数据，是否继续？')) {
                    return;
                }
            }
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                await this.importFullBackup(file);
                showToast('数据导入成功', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }

            e.target.value = '';
        });
    },

    /**
     * 初始化数据导出功能
     */
    initDataExport() {
        document.getElementById('btnExportAll').addEventListener('click', () => {
            this.exportFullBackup();
        });
    },

    /**
     * 导出完整备份
     */
    exportFullBackup() {
        const data = {
            settings: SettingsModule.getSettings(),
            students: StudentModule.getStudents(),
            history: AttendanceModule.getRecords(),
            grades: GradeModule.getAllGradesData(),
            totalWeeks: SettingsModule.getTotalWeeks() || 20
        };

        if (data.students.length === 0 && !data.settings.semesterStart) {
            showToast('没有数据可备份', 'error');
            return;
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const courseName = data.settings.courseName || '课堂';
        const defaultFileName = `${courseName}互动数据_${today}.xlsx`;
        ExcelModule.exportFullBackup(data, defaultFileName);
        this.markDataSaved();
        showToast('数据备份成功', 'success');
    },

    /**
     * 导入完整备份
     * @param {File} file - Excel文件
     */
    async importFullBackup(file) {
        const data = await ExcelModule.importFullBackup(file);

        // 清空现有数据
        localStorage.removeItem('classroom_settings');
        localStorage.removeItem('classroom_students');
        localStorage.removeItem('classroom_interaction');
        localStorage.removeItem('classroom_grades');

        // 导入设置
        if (data.settings) {
            SettingsModule.saveSettings(data.settings);
        }

        // 导入学生
        if (data.students && data.students.length > 0) {
            StudentModule.saveStudents(data.students);
        }

        // 导入互动记录
        if (data.history && data.history.length > 0) {
            AttendanceModule.saveRecords(data.history);
        }

        // 导入成绩
        if (data.grades && Object.keys(data.grades).length > 0) {
            GradeModule.saveGrades(data.grades);
        }

        // 刷新所有模块显示
        SettingsModule.updateHeaderDisplay();
        SettingsModule.updateSettingsDisplay();
        StudentModule.renderStudentList();
        AttendanceModule.updateTodayDisplay();
        AttendanceModule.renderHistory();
        GradeModule.renderGradeList();

        // 标记为已保存
        this.markDataSaved();
    }
};

/**
 * 显示Toast消息
 * @param {string} message - 消息内容
 * @param {string} type - 类型 (success/error)
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

/**
 * 标记数据已变更（全局函数，供各模块调用）
 */
function markDataChanged() {
    App.markDataChanged();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});