/**
 * Excel处理模块
 * 使用SheetJS库处理Excel文件的导入导出
 */
const ExcelModule = {
    /**
     * 从Excel文件导入学生数据
     * @param {File} file - Excel文件
     * @returns {Promise<Array>} 学生数据数组
     */
    importStudents(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // 读取第一个工作表
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                    // 跳过表头，解析学生数据
                    const students = [];
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (row && row.length >= 2 && row[0] && row[1]) {
                            students.push({
                                id: String(row[0]).trim(),
                                name: String(row[1]).trim(),
                                rollCount: 0 // 被点名次数
                            });
                        }
                    }

                    resolve(students);
                } catch (error) {
                    reject(new Error('Excel文件解析失败：' + error.message));
                }
            };

            reader.onerror = function() {
                reject(new Error('文件读取失败'));
            };

            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * 导出学生数据到Excel
     * @param {Array} students - 学生数据
     * @param {string} filename - 文件名
     */
    exportStudents(students, filename = '学生名单.xlsx') {
        const data = [
            ['学号', '姓名', '被点名次数']
        ];

        students.forEach(student => {
            data.push([student.id, student.name, student.rollCount || 0]);
        });

        this.downloadExcel(data, filename);
    },

    /**
     * 导出成绩数据到Excel
     * @param {Array} gradesData - 成绩数据
     * @param {string} filename - 文件名
     */
    exportGrades(gradesData, filename = '成绩汇总.xlsx') {
        const data = [
            ['学号', '姓名', '出勤次数', '缺勤次数', '迟到次数', '请假次数', '出勤率(%)', '表现评分', '总评成绩']
        ];

        gradesData.forEach(item => {
            data.push([
                item.id,
                item.name,
                item.presentCount || 0,
                item.absentCount || 0,
                item.lateCount || 0,
                item.leaveCount || 0,
                item.attendanceRate || 0,
                item.performanceScore || 0,
                item.totalScore || 0
            ]);
        });

        this.downloadExcel(data, filename);
    },

    /**
     * 导出点名历史记录到Excel
     * @param {Array} history - 历史记录
     * @param {string} filename - 文件名
     */
    exportHistory(history, filename = '点名记录.xlsx') {
        const data = [
            ['日期', '时间', '学号', '姓名', '状态']
        ];

        const statusMap = {
            'present': '出勤',
            'absent': '缺勤',
            'late': '迟到',
            'leave': '请假'
        };

        history.forEach(record => {
            data.push([
                record.date,
                record.time,
                record.studentId,
                record.studentName,
                statusMap[record.status] || record.status
            ]);
        });

        this.downloadExcel(data, filename);
    },

    /**
     * 导出全部数据到Excel（多工作表）- 包含系统设置
     * @param {Object} allData - 包含settings, students, history, grades的对象
     * @param {string} filename - 文件名
     */
    exportAllData(allData, filename = '课堂数据备份.xlsx') {
        const workbook = XLSX.utils.book_new();

        // 系统设置工作表（新增）
        const settingsData = [
            ['Setting', 'Value'],
            ['courseName', allData.settings?.courseName || ''],
            ['courseProgress', allData.settings?.courseProgress || ''],
            ['semesterStart', allData.settings?.semesterStart || ''],
            ['semesterEnd', allData.settings?.semesterEnd || ''],
            ['enableCelebration', allData.settings?.enableCelebration !== false ? 'true' : 'false'],
            ['backupTime', new Date().toLocaleString('zh-CN')]
        ];
        const settingsSheet = XLSX.utils.aoa_to_sheet(settingsData);
        XLSX.utils.book_append_sheet(workbook, settingsSheet, '系统设置');

        // 学生名单工作表
        const studentsData = [['学号', '姓名', '互动次数']];
        allData.students.forEach(s => {
            studentsData.push([s.id, s.name, s.rollCount || 0]);
        });
        const studentsSheet = XLSX.utils.aoa_to_sheet(studentsData);
        XLSX.utils.book_append_sheet(workbook, studentsSheet, '学生名单');

        // 互动记录工作表
        const historyData = [['日期', '时间', '学号', '姓名', '评分', '周次']];
        allData.history.forEach(h => {
            historyData.push([h.date, h.time, h.studentId, h.studentName, h.score, h.week]);
        });
        const historySheet = XLSX.utils.aoa_to_sheet(historyData);
        XLSX.utils.book_append_sheet(workbook, historySheet, '互动记录');

        // 成绩数据工作表（动态周数）
        const totalWeeks = allData.totalWeeks || 20;
        const gradesHeader = ['学号', '姓名'];
        for (let i = 1; i <= totalWeeks; i++) {
            gradesHeader.push(`第${i}周`);
        }
        gradesHeader.push('平均分', '评分次数');

        const gradesData = [gradesHeader];
        allData.grades.forEach(g => {
            const row = [g.id, g.name];
            for (let w = 1; w <= totalWeeks; w++) {
                row.push(g.scores[w] !== undefined ? g.scores[w] : '');
            }
            row.push(g.avgScore || 0, g.scoreCount || 0);
            gradesData.push(row);
        });
        const gradesSheet = XLSX.utils.aoa_to_sheet(gradesData);
        XLSX.utils.book_append_sheet(workbook, gradesSheet, '成绩数据');

        // 下载
        XLSX.writeFile(workbook, filename);
    },

    /**
     * 导出完整备份（包含所有localStorage数据）
     * @param {Object} allData - 完整数据对象
     * @param {string} filename - 文件名
     */
    exportFullBackup(allData, filename = '课堂互动系统数据.xlsx') {
        this.exportAllData(allData, filename);
    },

    /**
     * 从Excel文件导入完整备份数据
     * @param {File} file - Excel文件
     * @returns {Promise<Object>} 包含所有数据的对象
     */
    importFullBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    const result = {
                        settings: { courseName: '', courseProgress: '', semesterStart: null, semesterEnd: null, enableCelebration: true },
                        students: [],
                        history: [],
                        grades: {}
                    };

                    // 读取系统设置
                    if (workbook.SheetNames.includes('系统设置')) {
                        const settingsSheet = workbook.Sheets['系统设置'];
                        const settingsRows = XLSX.utils.sheet_to_json(settingsSheet, { header: 1 });
                        for (let i = 1; i < settingsRows.length; i++) {
                            const row = settingsRows[i];
                            if (row && row.length >= 2) {
                                if (row[0] === 'courseName') {
                                    result.settings.courseName = String(row[1] || '').trim();
                                } else if (row[0] === 'courseProgress') {
                                    result.settings.courseProgress = String(row[1] || '').trim();
                                } else if (row[0] === 'semesterStart' && row[1]) {
                                    result.settings.semesterStart = String(row[1]);
                                } else if (row[0] === 'semesterEnd' && row[1]) {
                                    result.settings.semesterEnd = String(row[1]);
                                } else if (row[0] === 'enableCelebration') {
                                    result.settings.enableCelebration = row[1] === 'true' || row[1] === true;
                                }
                            }
                        }
                    }

                    // 读取学生名单
                    if (workbook.SheetNames.includes('学生名单')) {
                        const studentsSheet = workbook.Sheets['学生名单'];
                        const studentsRows = XLSX.utils.sheet_to_json(studentsSheet, { header: 1 });
                        for (let i = 1; i < studentsRows.length; i++) {
                            const row = studentsRows[i];
                            if (row && row.length >= 2 && row[0] && row[1]) {
                                result.students.push({
                                    id: String(row[0]).trim(),
                                    name: String(row[1]).trim(),
                                    rollCount: parseInt(row[2]) || 0
                                });
                            }
                        }
                    }

                    // 读取互动记录
                    if (workbook.SheetNames.includes('互动记录')) {
                        const historySheet = workbook.Sheets['互动记录'];
                        const historyRows = XLSX.utils.sheet_to_json(historySheet, { header: 1 });
                        for (let i = 1; i < historyRows.length; i++) {
                            const row = historyRows[i];
                            if (row && row.length >= 5 && row[0] && row[2]) {
                                result.history.push({
                                    date: String(row[0]).trim(),
                                    time: String(row[1]).trim(),
                                    studentId: String(row[2]).trim(),
                                    studentName: String(row[3]).trim(),
                                    score: parseInt(row[4]) || 0,
                                    week: parseInt(row[5]) || 1
                                });
                            }
                        }
                    }

                    // 读取成绩数据
                    if (workbook.SheetNames.includes('成绩数据')) {
                        const gradesSheet = workbook.Sheets['成绩数据'];
                        const gradesRows = XLSX.utils.sheet_to_json(gradesSheet, { header: 1 });
                        if (gradesRows.length > 0) {
                            const header = gradesRows[0];
                            // 找出周次列的索引（从"第1周"开始）
                            const weekColumns = [];
                            for (let j = 2; j < header.length - 2; j++) { // 跳过学号、姓名，以及最后的平均分、评分次数
                                const colName = header[j];
                                if (colName && colName.startsWith('第') && colName.endsWith('周')) {
                                    const weekNum = parseInt(colName.replace('第', '').replace('周', ''));
                                    if (!isNaN(weekNum)) {
                                        weekColumns.push({ index: j, week: weekNum });
                                    }
                                }
                            }

                            for (let i = 1; i < gradesRows.length; i++) {
                                const row = gradesRows[i];
                                if (row && row.length >= 2 && row[0]) {
                                    const studentId = String(row[0]).trim();
                                    result.grades[studentId] = {};

                                    weekColumns.forEach(col => {
                                        const score = row[col.index];
                                        if (score !== undefined && score !== '' && !isNaN(score)) {
                                            result.grades[studentId][col.week] = parseInt(score);
                                        }
                                    });
                                }
                            }
                        }
                    }

                    resolve(result);
                } catch (error) {
                    reject(new Error('数据解析失败：' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };

            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * 下载Excel文件
     * @param {Array} data - 二维数组数据
     * @param {string} filename - 文件名
     */
    downloadExcel(data, filename) {
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, filename);
    }
};