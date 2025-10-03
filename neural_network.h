#ifndef NEURAL_NETWORK_H
#define NEURAL_NETWORK_H

#include <vector>
#include <string>
#include <unordered_map>
#include <functional>
#include <stdexcept>

// 활성화 함수 타입 정의
typedef std::function<double(double)> ActivationFunction;
typedef std::function<double(double)> ActivationDerivative;

// 뉴런 클래스
class Neuron {
public:
    Neuron();

    void activate(const ActivationFunction& activation, const ActivationDerivative& derivative);
    void set_value(double val);
    double get_value() const;
    double get_activated_value() const;
    double get_derivative() const;

private:
    double value;            // 입력 값
    double activated_value;  // 활성화 값
    double derivative;       // 활성화 함수의 미분 값
};

// 레이어 클래스
class Layer {
public:
    Layer(int num_neurons, int num_inputs_per_neuron);

    void feed_forward(const std::vector<Neuron>& prev_layer, const ActivationFunction& activation, const ActivationDerivative& derivative);
    void update_weights(const std::vector<Neuron>& prev_layer, double learning_rate);

    std::vector<Neuron>& get_neurons();
    std::vector<std::vector<double>>& get_weights();
    std::vector<double>& get_biases();

private:
    std::vector<Neuron> neurons;
    std::vector<std::vector<double>> weights;
    std::vector<double> biases;
};

// 신경망 클래스
class NeuralNetwork {
public:
    NeuralNetwork(const std::vector<int>& topology, const std::string& activation_function = "relu");

    void feed_forward(const std::vector<double>& input_values);
    void backpropagate(const std::vector<double>& target_values, double learning_rate);
    double calculate_loss(const std::vector<double>& target_values, const std::string& loss_function = "mse");
    void train(const std::vector<std::vector<double>>& training_data,
               const std::vector<std::vector<double>>& target_data,
               int epochs, double learning_rate);

    std::vector<double> get_output_values() const;

private:
    std::vector<Layer> layers;
    std::string activation_function;
    std::unordered_map<std::string, ActivationFunction> activation_map;
    std::unordered_map<std::string, ActivationDerivative> derivative_map;

    void initialize_activation_functions();
};

#endif // NEURAL_NETWORK_H
