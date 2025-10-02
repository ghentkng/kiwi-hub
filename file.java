import java.util.Arrays;

public class file {
    public static void main(String[] args) {

        int[][] mat = new int[][] {
 {23, 5, -9, 212},
 {34, 89, 74, 10, 3},
 {341, 895, 284}
};
for(int i = 0; i < 3; i++) {
 mat[i][i] += mat[i][0]--;
 mat[0][i] -= mat[i][i]++;
 mat[0][i] *= -1;
}
System.out.println(
 Arrays.toString(mat[0])); 
    }



}