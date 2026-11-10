import ApiService from "./ApiService";

class ApiManager {
	static async getExperiences() {
		return ApiService.getExperiences()
			.then((res) => res.data.experiences)
			.catch((err) => []);
	}

	static async getSkills() {
		return ApiService.getSkills()
			.then((res) => res.data.skills)
			.catch((err) => []);
	}

	static async getProjects() {
		return ApiService.getProjects()
			.then((res) => res.data.projects)
			.catch((err) => []);
	}
}

export default ApiManager;
