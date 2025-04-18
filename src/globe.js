/**
 * Class để quản lý việc tạo và tương tác với quả địa cầu
 */
class Globe {
    constructor(containerId) {
        this.containerId = containerId;
        this.width = 0;
        this.height = 0;
        this.projection = null;
        this.svg = null;
        this.path = null;
        this.countries = null;
        this.countriesData = null;
        this.worldData = null;
        this.graticule = null;
        this.rotation = { x: 0, y: 0, z: 0 };
        this.dragging = false;
        this.dragStart = null;
        this.rotationSpeed = 0.2;
        this.autoRotationEnabled = true;
        this.autoRotationInterval = null;
        this.selectedCountry = null;
        this.selectedContinent = null;
        this.continentCountries = [];
        this.labels = [];
        this.countryNamesByCode = {};

        // Khởi tạo
        this.init();
    }

    /**
     * Khởi tạo quả địa cầu
     */
    init() {
        // Lấy kích thước container
        const container = document.getElementById(this.containerId);
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        // Tính toán tâm thực tế sau khi trừ đi padding
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Tạo phép chiếu orthographic
        this.projection = d3
            .geoOrthographic()
            .scale(Math.min(this.width, this.height) * 0.45)
            .translate([centerX, centerY])
            .clipAngle(90);

        // Tạo đường dẫn địa lý
        this.path = d3.geoPath().projection(this.projection);

        // Tạo graticule (lưới kinh tuyến, vĩ tuyến)
        this.graticule = d3.geoGraticule();

        // Tạo SVG
        this.svg = d3
            .select(`#${this.containerId}`)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height);

        // Hiển thị thông báo đang tải
        this.showLoading();

        // Tải dữ liệu
        this.loadData();

        // Xử lý sự kiện resize
        window.addEventListener("resize", () => {
            this.resize();
        });

        // Đảm bảo không có thông báo đang tải nào còn hiển thị sau khi khởi tạo
        setTimeout(() => {
            this.hideLoading();
        }, 5000); // Thêm timeout 5 giây để đảm bảo bản đồ đã được tải xong
    }

    /**
     * Hiển thị thông báo đang tải
     */
    showLoading() {
        const container = d3.select(`#${this.containerId}`);
        container.append("div").attr("class", "loading").html("<p>Đang tải bản đồ thế giới...</p>");
    }

    /**
     * Xóa thông báo đang tải
     */
    hideLoading() {
        const container = d3.select(`#${this.containerId}`);
        // Xóa tất cả các phần tử có class "loading"
        container.selectAll(".loading").remove();
    }

    /**
     * Tải dữ liệu địa lý và thông tin quốc gia
     */
    loadData() {
        // Hiển thị thông báo đang tải
        this.showLoading();

        // Mảng các nguồn dữ liệu thế giới theo thứ tự ưu tiên
        const worldDataSources = [
            "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
            "https://unpkg.com/world-atlas@2/countries-110m.json",
            "./public/data/world-110m.json", // Nguồn cục bộ (nếu bạn đã tải về)
        ];

        // Mảng các nguồn dữ liệu quốc gia theo thứ tự ưu tiên
        const countryDataSources = [
            "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/slim-3/slim-3.json",
            "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json",
            "./public/data/countries.json", // Nguồn cục bộ (nếu bạn đã tải về)
        ];

        // Hàm thử tải dữ liệu từ nhiều nguồn
        const loadFromMultipleSources = async (sources) => {
            let lastError = null;

            for (const source of sources) {
                try {
                    const response = await fetch(source);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    return data;
                } catch (error) {
                    // console.warn(`Không thể tải từ ${source}: ${error.message}`);
                    lastError = error;
                }
            }

            throw new Error(`Không thể tải dữ liệu từ bất kỳ nguồn nào: ${lastError?.message}`);
        };

        // Tải dữ liệu từ các nguồn
        Promise.all([loadFromMultipleSources(worldDataSources), loadFromMultipleSources(countryDataSources)])
            .then(([worldData, countriesData]) => {
                // Kiểm tra dữ liệu worldData có hợp lệ không
                if (!worldData || !worldData.objects || !worldData.objects.countries) {
                    throw new Error("Dữ liệu bản đồ thế giới không hợp lệ hoặc định dạng không đúng");
                }

                // Kiểm tra dữ liệu countriesData có hợp lệ không
                if (!Array.isArray(countriesData) || countriesData.length === 0) {
                    throw new Error("Dữ liệu quốc gia không hợp lệ hoặc trống");
                }

                this.worldData = worldData;
                this.countriesData = countriesData;

                // Xử lý từng quốc gia
                this.countryNamesByCode = {};

                // In ra mẫu dữ liệu của một vài quốc gia để kiểm tra cấu trúc
                if (countriesData.length > 0) {
                }

                // Bảng chuyển đổi tên khu vực/châu lục để chuẩn hóa
                const regionMapping = {
                    americas: "Americas",
                    america: "Americas",
                    "north america": "Americas",
                    "south america": "Americas",
                    "latin america": "Americas",
                    asia: "Asia",
                    "eastern asia": "Asia",
                    "south-eastern asia": "Asia",
                    "southern asia": "Asia",
                    "central asia": "Asia",
                    europe: "Europe",
                    "northern europe": "Europe",
                    "southern europe": "Europe",
                    "eastern europe": "Europe",
                    "western europe": "Europe",
                    africa: "Africa",
                    "northern africa": "Africa",
                    "sub-saharan africa": "Africa",
                    "eastern africa": "Africa",
                    "western africa": "Africa",
                    "southern africa": "Africa",
                    oceania: "Oceania",
                    "australia and new zealand": "Oceania",
                    melanesia: "Oceania",
                    micronesia: "Oceania",
                    polynesia: "Oceania",
                };

                countriesData.forEach((country) => {
                    if (country && country["alpha-3"]) {
                        // Kiểm tra và chuẩn hóa thông tin khu vực/châu lục
                        // Dữ liệu từ API này có thể có cấu trúc khác nhau
                        let region = "Không xác định";

                        // Các trường có thể chứa thông tin châu lục, thử lần lượt
                        const possibleRegionFields = [
                            "region",
                            "continent",
                            "sub-region",
                            "subregion",
                            "sub_region",
                            "intermediate-region",
                            "intermediate_region",
                        ];

                        for (const field of possibleRegionFields) {
                            if (country[field] && country[field].trim() !== "") {
                                region = country[field];
                                break;
                            }
                        }

                        // Chuẩn hóa tên châu lục
                        const regionLower = region.toLowerCase();
                        if (regionMapping[regionLower]) {
                            region = regionMapping[regionLower];
                        }

                        // Lưu thông tin quốc gia
                        this.countryNamesByCode[country["alpha-3"]] = {
                            name: country.name || "Không xác định",
                            continent: region,
                            // Lưu thông tin chi tiết cho debugging
                            originalData: {
                                region: country.region || "",
                                subregion: country.subregion || country.sub_region || "",
                                intermediate_region:
                                    country.intermediate_region || country["intermediate-region"] || "",
                            },
                        };
                    }
                });

                // In ra phân phối của các châu lục
                const continentCounts = {};
                Object.values(this.countryNamesByCode).forEach((countryInfo) => {
                    const continent = countryInfo.continent;
                    continentCounts[continent] = (continentCounts[continent] || 0) + 1;
                });

                // Kiểm tra dữ liệu cho Brazil
                if (this.countryNamesByCode["BRA"]) {
                    const brazilContinent = this.countryNamesByCode["BRA"].continent;
                    const sameContinent = this.countriesData.filter(
                        (c) => c.region && brazilContinent && c.region.toLowerCase() === brazilContinent.toLowerCase()
                    );
                }

                // Kiểm tra bảng tra cứu có dữ liệu không
                if (Object.keys(this.countryNamesByCode).length === 0) {
                    throw new Error("Không thể tạo bảng tra cứu tên quốc gia");
                }

                // Vẽ địa cầu
                this.render();

                // Ẩn thông báo đang tải
                this.hideLoading();

                // Bắt đầu xoay tự động
                this.startAutoRotation();

                // Thiết lập các sự kiện tương tác người dùng
                this.setupInteractions();
            })
            .catch((error) => {
                // console.error("Lỗi khi tải dữ liệu:", error);
                this.createErrorMessage(`Lỗi: Không thể tải dữ liệu (${error.message})`);
                this.hideLoading();
                d3.select(`#${this.containerId}`).append("div").attr("class", "error-message")
                    .html(`<p>Không thể tải dữ liệu bản đồ. Lỗi: ${error.message}</p>
                       <p>Kiểm tra kết nối internet và thử tải lại trang.</p>
                       <p>Chi tiết lỗi: ${
                           error.stack ? error.stack.substring(0, 150) + "..." : "Không có thông tin chi tiết"
                       }</p>
                       <button id="retry-button" style="padding: 8px 15px; margin-top: 10px; cursor: pointer;">Thử lại</button>
                       <button id="download-button" style="padding: 8px 15px; margin-top: 10px; margin-left: 10px; cursor: pointer;">Tải dữ liệu</button>`);

                // Thêm sự kiện cho nút thử lại
                setTimeout(() => {
                    const retryButton = document.getElementById("retry-button");
                    if (retryButton) {
                        retryButton.addEventListener("click", () => {
                            window.location.reload();
                        });
                    }

                    const downloadButton = document.getElementById("download-button");
                    if (downloadButton) {
                        downloadButton.addEventListener("click", () => {
                            alert(
                                "Để tải dữ liệu cục bộ, hãy làm theo các bước sau:\n\n" +
                                    "1. Tạo thư mục public/data trong dự án\n" +
                                    "2. Tải file từ https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json và lưu thành public/data/world-110m.json\n" +
                                    "3. Tải file từ https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/slim-3/slim-3.json và lưu thành public/data/countries.json\n" +
                                    "4. Tải lại trang"
                            );
                        });
                    }
                }, 100);
            });
    }

    /**
     * Render địa cầu
     */
    render() {
        if (!this.worldData || !this.countriesData) {
            // console.error("Dữ liệu thế giới hoặc quốc gia không hợp lệ:", {
            //     worldData: this.worldData,
            //     countriesDataLength: this.countriesData ? this.countriesData.length : "null",
            // });
            return;
        }

        // Kiểm tra dữ liệu TopoJSON có hợp lệ không
        if (!this.worldData.objects || !this.worldData.objects.countries) {
            // console.error("Dữ liệu TopoJSON không hợp lệ, thiếu objects.countries");
            return;
        }

        // Xóa các phần tử cũ
        this.svg.selectAll("*").remove();

        // Lấy kích thước thực tế của SVG sau khi đã trừ đi padding
        const effectiveWidth = this.width;
        const effectiveHeight = this.height;
        const centerX = effectiveWidth / 2;
        const centerY = effectiveHeight / 2;

        // Thêm khung bao quanh đại dương (tạo viền)
        this.svg
            .append("circle")
            .attr("class", "ocean-border")
            .attr("cx", centerX)
            .attr("cy", centerY)
            .attr("r", this.projection.scale() + 1)
            .attr("fill", "none")
            .attr("stroke", "#c0d6eb")
            .attr("stroke-width", 1.5);

        // Thêm lớp đại dương
        this.svg
            .append("circle")
            .attr("class", "ocean")
            .attr("cx", centerX)
            .attr("cy", centerY)
            .attr("r", this.projection.scale());

        // Thêm lưới kinh tuyến, vĩ tuyến
        this.svg.append("path").datum(this.graticule).attr("class", "graticule").attr("d", this.path);

        try {
            // Tạo các quốc gia
            const countries = topojson.feature(this.worldData, this.worldData.objects.countries).features;

            this.svg
                .selectAll(".country")
                .data(countries)
                .enter()
                .append("path")
                .attr("class", (d) => {
                    if (!d || d.id === undefined) return "country";

                    const countryCode = this.getCountryCodeFromId(d.id);
                    let classes = "country";

                    if (this.selectedCountry && countryCode === this.selectedCountry) {
                        classes += " country-selected";
                    } else if (
                        this.selectedContinent &&
                        this.getCountryContinent(countryCode) === this.selectedContinent
                    ) {
                        classes += " country-same-continent";
                    }

                    return classes;
                })
                .attr("d", this.path)
                .attr("id", (d) => (d && d.id !== undefined ? `country-${d.id}` : "unknown-country"))
                .on("click", (event, d) => {
                    if (!d || d.id === undefined) return;

                    const countryCode = this.getCountryCodeFromId(d.id);
                    const countryInfo = this.countryNamesByCode[countryCode];

                    if (countryInfo) {
                        this.selectCountry(countryCode);
                    }
                });

            // Thêm nhãn quốc gia nếu được chọn
            this.updateLabels();
        } catch (error) {
            // console.error("Lỗi khi vẽ bản đồ:", error);
            this.hideLoading();
            d3.select(`#${this.containerId}`).append("div").attr("class", "error-message")
                .html(`<p>Không thể vẽ bản đồ. Lỗi: ${error.message}</p>
                       <p>Vui lòng thử tải lại trang.</p>
                       <button id="retry-button" style="padding: 8px 15px; margin-top: 10px; cursor: pointer;">Thử lại</button>`);

            // Thêm sự kiện cho nút thử lại
            document.getElementById("retry-button").addEventListener("click", () => {
                window.location.reload();
            });
        }
    }

    /**
     * Cập nhật nhãn quốc gia
     */
    updateLabels() {
        // Xóa nhãn cũ
        this.svg.selectAll(".country-label").remove();

        // Nếu không có quốc gia được chọn, không hiển thị nhãn
        if (!this.selectedCountry) {
            return;
        }

        // Kiểm tra dữ liệu có hợp lệ không
        if (!this.worldData || !this.worldData.objects || !this.worldData.objects.countries) {
            // console.error("Dữ liệu thế giới không hợp lệ khi cập nhật nhãn");
            return;
        }

        try {
            const countries = topojson.feature(this.worldData, this.worldData.objects.countries).features;

            // Tìm quốc gia được chọn
            const selectedCountryFeature = countries.find((d) => {
                if (!d || d.id === undefined) return false;
                const countryCode = this.getCountryCodeFromId(d.id);
                return countryCode === this.selectedCountry;
            });

            if (!selectedCountryFeature) {
                // console.warn(`Không tìm thấy dữ liệu để hiển thị nhãn cho quốc gia: ${this.selectedCountry}`);
                return;
            }

            // Hiển thị nhãn cho quốc gia được chọn
            this.addCountryLabel(selectedCountryFeature, true);

            // Tìm các quốc gia cùng châu lục
            if (this.selectedContinent && this.selectedContinent !== "Không xác định") {
                const sameContinent = [];

                countries.forEach((feature) => {
                    if (!feature || feature.id === undefined) return;

                    const countryCode = this.getCountryCodeFromId(feature.id);
                    if (countryCode === this.selectedCountry) return; // Bỏ qua quốc gia hiện tại

                    const countryInfo = this.countryNamesByCode[countryCode];
                    if (!countryInfo) return;

                    // Kiểm tra châu lục
                    if (countryInfo.continent === this.selectedContinent) {
                        sameContinent.push(feature);
                    }
                });

                // Hiển thị nhãn cho một số quốc gia cùng châu lục (tối đa 10)
                // Chọn ngẫu nhiên để không hiển thị cùng một quốc gia mỗi lần
                sameContinent
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 10)
                    .forEach((feature) => {
                        this.addCountryLabel(feature, false);
                    });
            }
        } catch (error) {
            // console.error("Lỗi khi cập nhật nhãn quốc gia:", error);
        }
    }

    /**
     * Thêm nhãn cho một quốc gia
     */
    addCountryLabel(feature, isSelected) {
        if (!feature) return;

        const countryCode = this.getCountryCodeFromId(feature.id);
        const countryInfo = this.countryNamesByCode[countryCode];
        if (!countryInfo) return;

        // Tính toán centroid
        const centroid = this.path.centroid(feature);

        // Chỉ hiển thị nhãn khi quốc gia đang nhìn thấy được
        if (
            centroid &&
            centroid.length >= 2 &&
            centroid[0] &&
            centroid[1] &&
            !isNaN(centroid[0]) &&
            !isNaN(centroid[1])
        ) {
            // Kiểm tra xem điểm có nằm trên nửa quả cầu nhìn thấy được không
            try {
                const coords = this.projection.invert([centroid[0], centroid[1]]);
                if (coords) {
                    const [lon, lat] = coords;
                    const [cx, cy] = this.projection.rotate();
                    const r = d3.geoDistance([-cx, -cy], [lon, lat]);

                    if (r < Math.PI / 2) {
                        // Thêm nhãn
                        const labelClass = isSelected ? "country-label selected-country-label" : "country-label";
                        this.svg
                            .append("text")
                            .attr("class", labelClass)
                            .attr("transform", `translate(${centroid[0]},${centroid[1]})`)
                            .text(countryInfo.name);
                    }
                }
            } catch (error) {
                // console.warn("Lỗi khi tính toán vị trí nhãn:", error);
            }
        }
    }

    /**
     * Thiết lập các sự kiện tương tác
     */
    setupInteractions() {
        // Xử lý drag để xoay địa cầu
        this.svg.call(
            d3
                .drag()
                .on("start", (event) => {
                    this.dragging = true;
                    this.stopAutoRotation();
                    this.dragStart = [event.x, event.y];
                })
                .on("drag", (event) => {
                    if (!this.dragging) return;

                    const dragEnd = [event.x, event.y];
                    const dx = dragEnd[0] - this.dragStart[0];
                    const dy = dragEnd[1] - this.dragStart[1];

                    // Cập nhật góc xoay
                    this.rotation.x = (this.rotation.x + dx * this.rotationSpeed) % 360;
                    this.rotation.y = Math.max(-90, Math.min(90, this.rotation.y + dy * this.rotationSpeed));

                    // Cập nhật phép chiếu
                    this.projection.rotate([this.rotation.x, this.rotation.y, this.rotation.z]);

                    // Cập nhật đường dẫn
                    this.svg.selectAll("path").attr("d", this.path);

                    // Cập nhật nhãn
                    this.updateLabels();

                    // Cập nhật điểm bắt đầu
                    this.dragStart = dragEnd;
                })
                .on("end", () => {
                    this.dragging = false;
                    if (this.autoRotationEnabled) {
                        this.startAutoRotation();
                    }
                })
        );
    }

    /**
     * Bắt đầu xoay tự động
     */
    startAutoRotation() {
        if (this.autoRotationInterval) return;

        this.autoRotationInterval = setInterval(() => {
            if (this.dragging) return;

            // Cập nhật góc xoay
            this.rotation.x = (this.rotation.x + 0.2) % 360;

            // Cập nhật phép chiếu
            this.projection.rotate([this.rotation.x, this.rotation.y, this.rotation.z]);

            // Cập nhật đường dẫn
            this.svg.selectAll("path").attr("d", this.path);

            // Cập nhật nhãn
            this.updateLabels();
        }, 30);
    }

    /**
     * Dừng xoay tự động
     */
    stopAutoRotation() {
        if (this.autoRotationInterval) {
            clearInterval(this.autoRotationInterval);
            this.autoRotationInterval = null;
        }
    }

    /**
     * Xoay đến quốc gia được chọn
     */
    rotateToCountry(countryCode) {
        if (!countryCode || !this.worldData) return;

        // Tìm feature của quốc gia
        const countries = topojson.feature(this.worldData, this.worldData.objects.countries).features;
        const country = countries.find((d) => this.getCountryCodeFromId(d.id) === countryCode);

        if (!country) return;

        // Tính centroid của quốc gia
        const centroid = d3.geoCentroid(country);

        // Dừng xoay tự động
        this.stopAutoRotation();

        // Lưu góc xoay hiện tại
        const startRotation = [this.rotation.x, this.rotation.y, this.rotation.z];

        // Góc xoay mới (âm của centroid vì chúng ta xoay địa cầu để hiển thị quốc gia)
        const targetRotation = [-centroid[0], -centroid[1], 0];

        // Tạo animation chuyển động mượt
        d3.transition()
            .duration(1000)
            .tween("rotate", () => {
                const r = d3.interpolate(startRotation, targetRotation);
                return (t) => {
                    const rotation = r(t);
                    this.rotation.x = rotation[0];
                    this.rotation.y = rotation[1];
                    this.rotation.z = rotation[2];

                    // Cập nhật phép chiếu
                    this.projection.rotate([this.rotation.x, this.rotation.y, this.rotation.z]);

                    // Cập nhật đường dẫn
                    this.svg.selectAll("path").attr("d", this.path);

                    // Cập nhật nhãn
                    this.updateLabels();
                };
            })
            .on("end", () => {
                // Bắt đầu xoay tự động lại sau khi hoàn thành nếu cần
                if (this.autoRotationEnabled) {
                    this.startAutoRotation();
                }
            });
    }

    /**
     * Chọn quốc gia
     */
    selectCountry(countryCode) {
        if (!countryCode || !this.worldData) return;

        // Lưu quốc gia được chọn
        this.selectedCountry = countryCode;

        // Lấy thông tin châu lục
        const countryInfo = this.countryNamesByCode[countryCode];
        if (countryInfo) {
            this.selectedContinent = countryInfo.continent;

            // Kiểm tra xem có châu lục hay không
            if (!this.selectedContinent || this.selectedContinent === "Không xác định") {
                // console.warn(`Không thể xác định châu lục cho quốc gia: ${countryInfo.name}`);
                // Gán một châu lục cố định dựa trên mã quốc gia để demo
                this.setDefaultContinent(countryCode);
            }

            // Tìm tất cả các quốc gia cùng châu lục
            this.findCountriesInSameContinent(countryCode);

            // Thông báo sự kiện chọn quốc gia
            const event = new CustomEvent("country-selected", {
                detail: {
                    countryCode,
                    countryName: countryInfo.name,
                    continent: this.selectedContinent,
                    continentCountries: this.continentCountries,
                },
            });
            document.dispatchEvent(event);
        } else {
            // console.error(`Không tìm thấy thông tin cho quốc gia có mã: ${countryCode}`);
        }

        // Xoay đến quốc gia được chọn
        this.rotateToCountry(countryCode);

        // Cập nhật style
        this.updateCountryStyles();
    }

    /**
     * Tìm các quốc gia cùng châu lục
     */
    findCountriesInSameContinent(countryCode) {
        if (!this.selectedContinent || this.selectedContinent === "Không xác định") {
            this.continentCountries = [];
            return;
        }

        // Tạo bảng ánh xạ ngược từ setDefaultContinent để sử dụng khi cần
        const continentMap = this.getDefaultContinentMap();

        // Sử dụng selectedContinent đã được xác định
        this.continentCountries = Object.entries(this.countryNamesByCode)
            .filter(([code, info]) => {
                // Kiểm tra xem quốc gia có cùng châu lục không
                const countryContinent = info.continent || continentMap[code] || null;
                return countryContinent === this.selectedContinent && code !== countryCode;
            })
            .map(([code, info]) => ({
                name: info.name,
                "alpha-3": code,
                region: info.continent || this.selectedContinent,
            }));

        // Thêm quốc gia từ bảng ánh xạ mặc định nếu chúng chưa có trong danh sách
        if (this.selectedContinent && continentMap) {
            // Tìm tất cả các mã quốc gia có châu lục trùng với selectedContinent
            const countriesInContinent = Object.entries(continentMap).filter(
                ([code, continent]) =>
                    continent === this.selectedContinent &&
                    code !== countryCode &&
                    !this.continentCountries.some((country) => country["alpha-3"] === code)
            );

            // Thêm các quốc gia này vào danh sách nếu có thông tin trong countryNamesByCode
            countriesInContinent.forEach(([code]) => {
                if (this.countryNamesByCode[code]) {
                    this.continentCountries.push({
                        name: this.countryNamesByCode[code].name,
                        "alpha-3": code,
                        region: this.selectedContinent,
                    });
                }
            });
        }
    }

    /**
     * Lấy bảng ánh xạ mã quốc gia với châu lục
     */
    getDefaultContinentMap() {
        return {
            // Châu Phi
            DZA: "Africa",
            AGO: "Africa",
            BEN: "Africa",
            BWA: "Africa",
            BFA: "Africa",
            BDI: "Africa",
            CMR: "Africa",
            CPV: "Africa",
            CAF: "Africa",
            TCD: "Africa",
            COM: "Africa",
            COD: "Africa",
            DJI: "Africa",
            EGY: "Africa",
            GNQ: "Africa",
            ERI: "Africa",
            ETH: "Africa",
            GAB: "Africa",
            GMB: "Africa",
            GHA: "Africa",
            GIN: "Africa",
            GNB: "Africa",
            CIV: "Africa",
            KEN: "Africa",
            LSO: "Africa",
            LBR: "Africa",
            LBY: "Africa",
            MDG: "Africa",
            MWI: "Africa",
            MLI: "Africa",
            MRT: "Africa",
            MUS: "Africa",
            MAR: "Africa",
            MOZ: "Africa",
            NAM: "Africa",
            NER: "Africa",
            NGA: "Africa",
            RWA: "Africa",
            STP: "Africa",
            SEN: "Africa",
            SYC: "Africa",
            SLE: "Africa",
            SOM: "Africa",
            ZAF: "Africa",
            SSD: "Africa",
            SDN: "Africa",
            SWZ: "Africa",
            TGO: "Africa",
            TUN: "Africa",
            UGA: "Africa",
            TZA: "Africa",
            ZMB: "Africa",
            ZWE: "Africa",

            // Châu Á
            AFG: "Asia",
            BHR: "Asia",
            BGD: "Asia",
            BTN: "Asia",
            BRN: "Asia",
            MMR: "Asia",
            KHM: "Asia",
            CHN: "Asia",
            IND: "Asia",
            IDN: "Asia",
            IRN: "Asia",
            IRQ: "Asia",
            ISR: "Asia",
            JPN: "Asia",
            JOR: "Asia",
            KAZ: "Asia",
            KWT: "Asia",
            KGZ: "Asia",
            LAO: "Asia",
            LBN: "Asia",
            MYS: "Asia",
            MDV: "Asia",
            MNG: "Asia",
            NPL: "Asia",
            OMN: "Asia",
            PAK: "Asia",
            PSE: "Asia",
            PHL: "Asia",
            QAT: "Asia",
            SAU: "Asia",
            SGP: "Asia",
            KOR: "Asia",
            LKA: "Asia",
            SYR: "Asia",
            TWN: "Asia",
            TJK: "Asia",
            THA: "Asia",
            TUR: "Asia",
            TKM: "Asia",
            ARE: "Asia",
            UZB: "Asia",
            VNM: "Asia",
            YEM: "Asia",

            // Châu Âu
            ALB: "Europe",
            AND: "Europe",
            AUT: "Europe",
            BLR: "Europe",
            BEL: "Europe",
            BIH: "Europe",
            BGR: "Europe",
            HRV: "Europe",
            CYP: "Europe",
            CZE: "Europe",
            DNK: "Europe",
            EST: "Europe",
            FIN: "Europe",
            FRA: "Europe",
            DEU: "Europe",
            GRC: "Europe",
            HUN: "Europe",
            ISL: "Europe",
            IRL: "Europe",
            ITA: "Europe",
            LVA: "Europe",
            LIE: "Europe",
            LTU: "Europe",
            LUX: "Europe",
            MLT: "Europe",
            MDA: "Europe",
            MCO: "Europe",
            MNE: "Europe",
            NLD: "Europe",
            MKD: "Europe",
            NOR: "Europe",
            POL: "Europe",
            PRT: "Europe",
            ROU: "Europe",
            RUS: "Europe",
            SMR: "Europe",
            SRB: "Europe",
            SVK: "Europe",
            SVN: "Europe",
            ESP: "Europe",
            SWE: "Europe",
            CHE: "Europe",
            UKR: "Europe",
            GBR: "Europe",
            VAT: "Europe",

            // Bắc Mỹ
            ATG: "North America",
            BHS: "North America",
            BRB: "North America",
            BLZ: "North America",
            CAN: "North America",
            CRI: "North America",
            CUB: "North America",
            DMA: "North America",
            DOM: "North America",
            SLV: "North America",
            GRD: "North America",
            GTM: "North America",
            HTI: "North America",
            HND: "North America",
            JAM: "North America",
            MEX: "North America",
            NIC: "North America",
            PAN: "North America",
            KNA: "North America",
            LCA: "North America",
            VCT: "North America",
            TTO: "North America",
            USA: "North America",

            // Nam Mỹ
            ARG: "South America",
            BOL: "South America",
            BRA: "South America",
            CHL: "South America",
            COL: "South America",
            ECU: "South America",
            GUY: "South America",
            PRY: "South America",
            PER: "South America",
            SUR: "South America",
            URY: "South America",
            VEN: "South America",

            // Châu Đại Dương
            AUS: "Oceania",
            FJI: "Oceania",
            KIR: "Oceania",
            MHL: "Oceania",
            FSM: "Oceania",
            NRU: "Oceania",
            NZL: "Oceania",
            PLW: "Oceania",
            PNG: "Oceania",
            WSM: "Oceania",
            SLB: "Oceania",
            TON: "Oceania",
            TUV: "Oceania",
            VUT: "Oceania",
        };
    }

    /**
     * Gán châu lục mặc định dựa trên mã quốc gia
     */
    setDefaultContinent(countryCode) {
        const continentMap = this.getDefaultContinentMap();

        if (continentMap[countryCode]) {
            this.selectedContinent = continentMap[countryCode];
        } else {
            this.selectedContinent = "Không xác định";
        }
    }

    /**
     * Cập nhật style cho các quốc gia
     */
    updateCountryStyles() {
        this.svg.selectAll(".country").attr("class", (d) => {
            const countryCode = this.getCountryCodeFromId(d.id);
            let classes = "country";

            if (countryCode === this.selectedCountry) {
                classes += " country-selected";
            } else if (this.selectedContinent && this.getCountryContinent(countryCode) === this.selectedContinent) {
                classes += " country-same-continent";
            }

            return classes;
        });

        // Cập nhật nhãn
        this.updateLabels();
    }

    /**
     * Xử lý khi cửa sổ thay đổi kích thước
     */
    resize() {
        const container = document.getElementById(this.containerId);

        // Cập nhật kích thước - tính toán không gian thực dành cho quả địa cầu
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        // Tính toán tâm
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Cập nhật SVG
        this.svg.attr("width", this.width).attr("height", this.height);

        // Tính toán tỷ lệ tối ưu để quả địa cầu khớp với container
        // Tăng tỷ lệ lên 0.45 để quả địa cầu lớn hơn
        const scale = Math.min(this.width, this.height) * 0.45;

        // Cập nhật phép chiếu với tỷ lệ mới
        this.projection.scale(scale).translate([centerX, centerY]);

        // Render lại
        this.render();
    }

    /**
     * Lấy mã quốc gia từ ID
     */
    getCountryCodeFromId(id) {
        // Kiểm tra id có hợp lệ không
        if (id === undefined || id === null) {
            return "unknown";
        }

        // Danh sách ánh xạ ID TopoJSON sang mã ISO-3
        // Dựa trên Natural Earth và World Bank
        const idToCode = {
            4: "AFG", // Afghanistan
            8: "ALB", // Albania
            12: "DZA", // Algeria
            24: "AGO", // Angola
            32: "ARG", // Argentina
            36: "AUS", // Australia
            40: "AUT", // Austria
            50: "BGD", // Bangladesh
            56: "BEL", // Belgium
            76: "BRA", // Brazil
            124: "CAN", // Canada
            152: "CHL", // Chile
            156: "CHN", // China
            170: "COL", // Colombia
            203: "CZE", // Czech Republic
            208: "DNK", // Denmark
            246: "FIN", // Finland
            250: "FRA", // France
            276: "DEU", // Germany
            300: "GRC", // Greece
            344: "HKG", // Hong Kong
            348: "HUN", // Hungary
            356: "IND", // India
            360: "IDN", // Indonesia
            372: "IRL", // Ireland
            376: "ISR", // Israel
            380: "ITA", // Italy
            392: "JPN", // Japan
            404: "KEN", // Kenya
            410: "KOR", // South Korea
            458: "MYS", // Malaysia
            484: "MEX", // Mexico
            528: "NLD", // Netherlands
            554: "NZL", // New Zealand
            566: "NGA", // Nigeria
            578: "NOR", // Norway
            586: "PAK", // Pakistan
            608: "PHL", // Philippines
            616: "POL", // Poland
            620: "PRT", // Portugal
            642: "ROU", // Romania
            643: "RUS", // Russia
            682: "SAU", // Saudi Arabia
            686: "SEN", // Senegal
            710: "ZAF", // South Africa
            724: "ESP", // Spain
            752: "SWE", // Sweden
            756: "CHE", // Switzerland
            764: "THA", // Thailand
            792: "TUR", // Turkey
            804: "UKR", // Ukraine
            826: "GBR", // United Kingdom
            840: "USA", // United States
            858: "URY", // Uruguay
            862: "VEN", // Venezuela
            704: "VNM", // Vietnam
            716: "ZWE", // Zimbabwe
        };

        // Trả về mã quốc gia ISO-3 nếu có trong bảng ánh xạ
        if (idToCode[id]) {
            return idToCode[id];
        }

        // Nếu không có trong bảng ánh xạ, tìm trong dữ liệu countriesData
        if (this.countriesData) {
            for (const country of this.countriesData) {
                if (country["country-code"] && country["country-code"] == id) {
                    return country["alpha-3"];
                }
                // Một số trường hợp ID là string
                if (country["country-code"] && id.toString && country["country-code"] == id.toString()) {
                    return country["alpha-3"];
                }
            }
        }

        // console.log(`Không tìm thấy mã quốc gia cho ID: ${id}`);
        // Trả về ID dưới dạng string nếu không tìm thấy và nếu id.toString tồn tại
        return id.toString ? id.toString() : String(id);
    }

    /**
     * Lấy châu lục của quốc gia
     */
    getCountryContinent(countryCode) {
        if (!countryCode) return null;

        const countryInfo = this.countryNamesByCode[countryCode];
        return countryInfo ? countryInfo.continent : null;
    }

    createErrorMessage(message) {
        d3.select(`#${this.containerId}`).append("div").attr("class", "error-message").html(`<p>${message}</p>
                   <button id="retry-button" style="padding: 8px 15px; margin-top: 10px; cursor: pointer;">Thử lại</button>`);

        // Thêm sự kiện cho nút thử lại
        document.getElementById("retry-button").addEventListener("click", () => {
            window.location.reload();
        });
    }
}
