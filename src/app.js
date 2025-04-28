/**
 * Ứng dụng chính cho địa cầu tương tác
 */
document.addEventListener("DOMContentLoaded", () => {
    const debug = window.debugLog || console.log;
    debug("Ứng dụng Địa Cầu Tương Tác đang khởi động...");

    try {
        // Lưu biến globe trong window để có thể truy cập từ mọi nơi
        window.globe = new Globe("globe-container");

        // Khởi tạo danh sách quốc gia
        initCountrySelect(window.globe);

        // Xử lý sự kiện khi chọn quốc gia
        document.addEventListener("country-selected", handleCountrySelection);
    } catch (error) {
        debug("Lỗi khi khởi tạo ứng dụng:", error);
        alert("Có lỗi xảy ra khi khởi tạo ứng dụng. Vui lòng tải lại trang.");
    }
});

/**
 * Khởi tạo dropdown chọn quốc gia
 */
function initCountrySelect(globe) {
    const countrySelect = document.getElementById("country-select");

    // Hiển thị thông báo đang tải
    countrySelect.innerHTML = '<option value="">Đang tải danh sách quốc gia...</option>';

    // Tải dữ liệu quốc gia từ API
    loadCountryData()
        .then((countries) => {
            // Xóa thông báo đang tải
            countrySelect.innerHTML = '<option value="">-- Chọn quốc gia --</option>';

            // Sắp xếp quốc gia theo tên
            countries.sort((a, b) => a.name.localeCompare(b.name));

            // Thêm quốc gia vào dropdown
            countries.forEach((country) => {
                const option = document.createElement("option");
                option.value = country["alpha-3"];
                option.textContent = country.name;
                countrySelect.appendChild(option);
            });

            // Xử lý sự kiện thay đổi
            countrySelect.addEventListener("change", (event) => {
                const countryCode = event.target.value;
                if (countryCode) {
                    globe.selectCountry(countryCode);
                }
            });
        })
        .catch((error) => {
            console.error("Lỗi khi tải danh sách quốc gia:", error);
            countrySelect.innerHTML = '<option value="">Lỗi tải danh sách quốc gia</option>';
        });
}

/**
 * Tải dữ liệu quốc gia từ API với xử lý lỗi và nguồn dự phòng
 */
async function loadCountryData() {
    const sources = [
        "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/slim-3/slim-3.json",
        "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json",
        // Thêm nguồn dữ liệu dự phòng khác nếu cần
    ];

    // Thử lần lượt từng nguồn dữ liệu
    for (const source of sources) {
        try {
            console.log(`Đang tải dữ liệu quốc gia từ nguồn: ${source}`);
            const response = await fetch(source);

            if (!response.ok) {
                throw new Error(`Mã lỗi HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Đã tải thành công ${data.length} quốc gia`);
            return data.filter((country) => country["alpha-3"] !== "ALA"); // Bỏ qua Åland Islands
        } catch (error) {
            console.error(`Lỗi khi tải từ nguồn ${source}:`, error);
            // Tiếp tục thử nguồn tiếp theo
        }
    }

    // Trả về danh sách trống nếu tất cả các nguồn đều thất bại
    console.error("Tất cả các nguồn dữ liệu đều thất bại");
    return [];
}

/**
 * Xử lý sự kiện khi chọn quốc gia
 */
function handleCountrySelection(event) {
    const debug = window.debugLog || console.log;
    const { countryCode, countryName, continent, continentCountries } = event.detail;

    debug("Đã nhận sự kiện chọn quốc gia:", {
        countryCode,
        countryName,
        continent,
        continentCountriesCount: continentCountries ? continentCountries.length : 0,
    });

    try {
        // Cập nhật dropdown
        const countrySelect = document.getElementById("country-select");
        countrySelect.value = countryCode;

        // Cập nhật thông tin quốc gia được chọn
        document.getElementById("selected-country").textContent = countryName || "Không xác định";

        // Kiểm tra và hiển thị châu lục
        let continentName = continent;
        if (!continent || continent === "Không xác định") {
            // Ghi log nhưng không hiển thị "Không xác định" cho người dùng
            debug(`Không tìm thấy thông tin châu lục cho quốc gia: ${countryName}`);
            // Hiển thị tên gọi thân thiện hơn
            continentName = continent || "Chưa xác định";
        }
        document.getElementById("continent-name").textContent = continentName;

        // Cập nhật danh sách quốc gia cùng châu lục
        updateContinentCountries(continentCountries);
    } catch (error) {
        debug("Lỗi khi xử lý sự kiện chọn quốc gia:", error);
    }
}

/**
 * Cập nhật danh sách quốc gia cùng châu lục
 */
function updateContinentCountries(continentCountries) {
    const continentCountriesList = document.getElementById("continent-countries");

    // Xóa danh sách cũ
    continentCountriesList.innerHTML = "";

    if (!continentCountries || continentCountries.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Không có dữ liệu";
        continentCountriesList.appendChild(li);
        return;
    }

    console.log(`Cập nhật danh sách ${continentCountries.length} quốc gia cùng châu lục`);

    // Sắp xếp theo tên
    continentCountries.sort((a, b) => a.name.localeCompare(b.name));

    // Lấy mã quốc gia hiện tại
    const currentCountryCode = document.getElementById("country-select").value;

    // Lọc quốc gia hiện tại ra khỏi danh sách
    const filteredCountries = continentCountries.filter(
        (country) => country && country["alpha-3"] && country["alpha-3"] !== currentCountryCode
    );

    if (filteredCountries.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Không có quốc gia khác cùng châu lục";
        continentCountriesList.appendChild(li);
        return;
    }

    // Thêm tất cả các quốc gia vào danh sách
    filteredCountries.forEach((country) => {
        if (!country.name) return;

        const li = document.createElement("li");
        li.textContent = country.name;

        if (country["alpha-3"]) {
            li.setAttribute("data-country-code", country["alpha-3"]);
            li.style.cursor = "pointer";

            // Thêm sự kiện click để chọn quốc gia
            li.addEventListener("click", () => {
                if (window.globe) {
                    window.globe.selectCountry(country["alpha-3"]);
                }
            });
        }

        continentCountriesList.appendChild(li);
    });
}
