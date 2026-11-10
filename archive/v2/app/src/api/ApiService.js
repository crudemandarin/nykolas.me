import axios from "axios";

class ApiService {
	static SERVICE_URL = process.env.REACT_APP_SERVICE_URL;

	static getExperiences() {
		return axios.get(this.SERVICE_URL + "experiences");
	}

	static getSkills() {
		return axios.get(this.SERVICE_URL + "skills");
	}

	static getProjects() {
		return axios.get(this.SERVICE_URL + "projects");
	}
}

export default ApiService;
